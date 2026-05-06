import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";

type PrepareLineInput = {
  rateId: string;
  quantity: number;
  unitAmount?: number;
};

type PrepareParticipantInput = {
  rateId: string;
  firstName: string;
  lastName: string;
};

function cleanString(value: unknown) {
  return String(value || "").trim();
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

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function makeReference() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const random = crypto.randomUUID().slice(0, 8).toUpperCase();

  return `BIL-${y}${m}${d}-${random}`;
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

    const extraDonationAmount = toPositiveCents(payload.extraDonationAmount);

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

    const rates = await storage.getTicketingRates(event.id);
    const activeRates = rates.filter((rate) => rate.isActive);

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

        let unitAmount = 0;

        if (rate.type === "fixed") {
          unitAmount = rate.amount || 0;
        }

        if (rate.type === "free_amount") {
          const requestedAmount = toPositiveCents(line.unitAmount);
          const minimumAmount = rate.minimumAmount || 0;
          unitAmount = Math.max(requestedAmount, minimumAmount);
        }

        if (rate.type === "free") {
          unitAmount = 0;
        }

        return {
          rateId: rate.id,
          rateName: rate.name,
          rateType: rate.type,
          quantity,
          unitAmount,
          lineTotal: unitAmount * quantity,
        };
      })
      .filter(Boolean) as Array<{
        rateId: string;
        rateName: string;
        rateType: string;
        quantity: number;
        unitAmount: number;
        lineTotal: number;
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
    }));

    const participantInvalid = preparedParticipants.some((participant) => {
      const lineExists = preparedLines.some(
        (line) => line.rateId === participant.rateId
      );

      return (
        !lineExists ||
        !participant.firstName ||
        !participant.lastName
      );
    });

    if (participantInvalid) {
      return NextResponse.json(
        {
          error:
            "Chaque participant doit avoir un prénom, un nom et un tarif valide.",
        },
        { status: 400 }
      );
    }

    const subtotalAmount = preparedLines.reduce(
      (sum, line) => sum + line.lineTotal,
      0
    );

    const finalExtraDonationAmount = event.allowExtraDonation
      ? extraDonationAmount
      : 0;

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
      subtotalAmount,
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