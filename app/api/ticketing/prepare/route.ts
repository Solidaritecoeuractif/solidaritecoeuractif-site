import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type {
  TicketingCustomField,
  TicketingEvent,
  TicketingRate,
} from "@/lib/ticketing/types";

type PrepareLineInput = {
  rateId: string;
  quantity: number;
  unitAmount?: number;
  originalUnitAmount?: number;
  promoCode?: string;
};

type PrepareParticipantInput = {
  rateId: string;
  firstName: string;
  lastName: string;
  age?: string;
  email?: string;
  phone?: string;
  originCity?: string;
  answers?: Record<string, string | boolean | number | null>;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
}

function normalizePromoCode(value: unknown) {
  return cleanString(value).toUpperCase();
}

function toPositiveInteger(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return 0;
  }

  return Math.floor(number);
}

function toPositiveCents(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number);
}

function normalizePercent(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeContributionPercent(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(10, Math.round(number)));
}

function applyPercentDiscount(amount: number, percent: number) {
  const safePercent = normalizePercent(percent);

  if (safePercent <= 0) return amount;

  return Math.max(0, Math.round(amount * (1 - safePercent / 100)));
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function fieldValueIsFilled(field: TicketingCustomField, value: unknown) {
  if (field.type === "checkbox") return value === true;
  return cleanString(value).length > 0;
}

function makeReference() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `BIL-${y}${m}${d}-${random}`;
}

function getOriginalUnitAmount(rate: TicketingRate, line: PrepareLineInput) {
  if (rate.type === "fixed") {
    return rate.amount || 0;
  }

  if (rate.type === "free_amount") {
    const requestedAmount = toPositiveCents(
      typeof line.originalUnitAmount === "number"
        ? line.originalUnitAmount
        : line.unitAmount
    );

    const minimumAmount = rate.minimumAmount || 0;

    return Math.max(requestedAmount, minimumAmount);
  }

  return 0;
}

function computePromoForLine(rate: TicketingRate, promoCodeInput: unknown) {
  const submittedCode = normalizePromoCode(promoCodeInput);

  if (!submittedCode) {
    return {
      promoApplied: false,
      promoCode: "",
      promoDiscountPercent: 0,
    };
  }

  const promoEnabled = Boolean(rate.promoCodeEnabled);
  const expectedCode = normalizePromoCode(rate.promoCode);
  const discountPercent = normalizePercent(rate.promoDiscountPercent);

  if (!promoEnabled || !expectedCode || discountPercent <= 0) {
    throw new Error(`Aucun code promo n’est disponible pour le tarif "${rate.name}".`);
  }

  if (submittedCode !== expectedCode) {
    throw new Error(`Le code promo saisi pour le tarif "${rate.name}" est invalide.`);
  }

  return {
    promoApplied: true,
    promoCode: expectedCode,
    promoDiscountPercent: discountPercent,
  };
}

function computeExtraDonationAmount(
  event: TicketingEvent,
  subtotalAmount: number,
  submittedExtraDonationAmount: unknown
) {
  if (!event.allowExtraDonation) return 0;

  const percent = normalizeContributionPercent(
    event.extraDonationSuggestedPercent
  );

  if (subtotalAmount <= 0 || percent <= 0) return 0;

  const suggestedAmount = Math.round((subtotalAmount * percent) / 100);
  const requestedAmount = toPositiveCents(submittedExtraDonationAmount);

  return Math.min(requestedAmount, suggestedAmount);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const eventSlug = cleanString(payload.eventSlug);
    const payer = {
      firstName: cleanString(payload.payer?.firstName),
      lastName: cleanString(payload.payer?.lastName),
      email: cleanString(payload.payer?.email).toLowerCase(),
      phone: cleanString(payload.payer?.phone),
    };

    const linesInput: PrepareLineInput[] = Array.isArray(payload.lines)
      ? payload.lines
      : [];

    const participantsInput: PrepareParticipantInput[] = Array.isArray(
      payload.participants
    )
      ? payload.participants
      : [];

    const submittedExtraDonationAmount = payload.extraDonationAmount;

    if (!eventSlug) {
      return NextResponse.json(
        { error: "Billetterie introuvable." },
        { status: 400 }
      );
    }

    const storage = ticketingStorage();
    const event = await storage.getTicketingEventBySlug(eventSlug);

    if (!event || !event.isVisible || event.status !== "published") {
      return NextResponse.json(
        { error: "Cette billetterie n’est pas disponible." },
        { status: 404 }
      );
    }

    if (
      !payer.firstName ||
      !payer.lastName ||
      !payer.email ||
      !payer.phone
    ) {
      return NextResponse.json(
        { error: "Les informations du payeur sont obligatoires." },
        { status: 400 }
      );
    }

    if (!isValidEmail(payer.email)) {
      return NextResponse.json(
        { error: "L’adresse email du payeur est invalide." },
        { status: 400 }
      );
    }

    const [rates, customFields] = await Promise.all([
      storage.getTicketingRates(event.id),
      storage.getTicketingCustomFields(event.id),
    ]);

    const activeRates = rates.filter((rate) => rate.isActive);
    const activeParticipantFields = customFields.filter(
      (field) => field.isActive && field.target === "participant"
    );

    const preparedLines = linesInput
      .map((line) => {
        const rate = activeRates.find((entry) => entry.id === line.rateId);

        if (!rate) return null;

        const quantity = toPositiveInteger(line.quantity);

        if (quantity <= 0) return null;

        if (
          typeof rate.quantityPerOrderLimit === "number" &&
          rate.quantityPerOrderLimit > 0 &&
          quantity > rate.quantityPerOrderLimit
        ) {
          throw new Error(
            `La quantité maximale pour le tarif "${rate.name}" est ${rate.quantityPerOrderLimit}.`
          );
        }

        const originalUnitAmount = getOriginalUnitAmount(rate, line);
        const promo = computePromoForLine(rate, line.promoCode);

        const unitAmount = promo.promoApplied
          ? applyPercentDiscount(originalUnitAmount, promo.promoDiscountPercent)
          : originalUnitAmount;

        const discountAmountPerUnit = Math.max(0, originalUnitAmount - unitAmount);

        return {
          rateId: rate.id,
          rateName: rate.name,
          rateType: rate.type,
          quantity,
          originalUnitAmount,
          unitAmount,
          discountAmountPerUnit,
          originalLineTotal: originalUnitAmount * quantity,
          lineTotal: unitAmount * quantity,
          discountTotal: discountAmountPerUnit * quantity,
          promoApplied: promo.promoApplied,
          promoCode: promo.promoCode,
          promoDiscountPercent: promo.promoDiscountPercent,
        };
      })
      .filter(Boolean) as Array<{
      rateId: string;
      rateName: string;
      rateType: string;
      quantity: number;
      originalUnitAmount: number;
      unitAmount: number;
      discountAmountPerUnit: number;
      originalLineTotal: number;
      lineTotal: number;
      discountTotal: number;
      promoApplied: boolean;
      promoCode: string;
      promoDiscountPercent: number;
    }>;

    if (preparedLines.length === 0) {
      return NextResponse.json(
        { error: "Sélectionne au moins un billet." },
        { status: 400 }
      );
    }

    const expectedParticipantCount = preparedLines.reduce(
      (sum, line) => sum + line.quantity,
      0
    );

    if (participantsInput.length !== expectedParticipantCount) {
      return NextResponse.json(
        {
          error:
            "Le nombre de participants ne correspond pas au nombre de billets sélectionnés.",
        },
        { status: 400 }
      );
    }

    const preparedParticipants = participantsInput.map((participant) => ({
      rateId: cleanString(participant.rateId),
      firstName: cleanString(participant.firstName),
      lastName: cleanString(participant.lastName),
      age: cleanString(participant.age),
      email: cleanString(participant.email).toLowerCase(),
      phone: cleanString(participant.phone),
      originCity: cleanString(participant.originCity),
      answers:
        participant.answers && typeof participant.answers === "object"
          ? participant.answers
          : {},
    }));

    const participantInvalid = preparedParticipants.some((participant) => {
      const lineExists = preparedLines.some(
        (line) => line.rateId === participant.rateId
      );

      return (
        !lineExists ||
        !participant.firstName ||
        !participant.lastName ||
        !participant.age ||
        !participant.email ||
        !isValidEmail(participant.email) ||
        !participant.phone ||
        !participant.originCity
      );
    });

    if (participantInvalid) {
      return NextResponse.json(
        {
          error:
            "Chaque participant doit avoir un prénom, un nom, un âge, un email valide, un téléphone et une ville d’origine.",
        },
        { status: 400 }
      );
    }

    const missingRequiredField = preparedParticipants.some((participant) =>
      activeParticipantFields.some((field) => {
        if (!field.isRequired) return false;
        return !fieldValueIsFilled(field, participant.answers[field.fieldKey]);
      })
    );

    if (missingRequiredField) {
      return NextResponse.json(
        {
          error:
            "Un ou plusieurs champs complémentaires obligatoires ne sont pas remplis.",
        },
        { status: 400 }
      );
    }

    const subtotalAmount = preparedLines.reduce(
      (sum, line) => sum + line.lineTotal,
      0
    );

    const discountAmount = preparedLines.reduce(
      (sum, line) => sum + line.discountTotal,
      0
    );

    const originalSubtotalAmount = preparedLines.reduce(
      (sum, line) => sum + line.originalLineTotal,
      0
    );

    const finalExtraDonationAmount = computeExtraDonationAmount(
      event,
      subtotalAmount,
      submittedExtraDonationAmount
    );

    const totalAmount = subtotalAmount + finalExtraDonationAmount;

    return NextResponse.json({
      ok: true,
      reference: makeReference(),
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
      },
      payer,
      lines: preparedLines,
      participants: preparedParticipants,
      originalSubtotalAmount,
      subtotalAmount,
      discountAmount,
      extraDonationAmount: finalExtraDonationAmount,
      totalAmount,
      currency: "eur",
      message:
        "Validation serveur réussie. Aucun paiement n’a été lancé et aucune inscription n’a encore été enregistrée.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de préparer cette inscription.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}