import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type { TicketingOrder, TicketingParticipant } from "@/lib/ticketing/types";

type TicketingLineInput = {
  rateId: string;
  quantity: number;
  unitAmount?: number;
};

type ParticipantInput = {
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

async function makeUniqueReference() {
  const storage = ticketingStorage();

  let reference = makeReference();

  while (await storage.getTicketingOrderByReference(reference)) {
    reference = makeReference();
  }

  return reference;
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

    const linesInput: TicketingLineInput[] = Array.isArray(payload.lines)
      ? payload.lines
      : [];

    const participantsInput: ParticipantInput[] = Array.isArray(
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

        return {
          rateId: rate.id,
          rateName: rate.name,
          quantity,
          unitAmount,
          lineTotal: unitAmount * quantity,
        };
      })
      .filter(Boolean) as Array<{
        rateId: string;
        rateName: string;
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

    const expectedCountByRateId = new Map<string, number>();

    for (const line of preparedLines) {
      expectedCountByRateId.set(line.rateId, line.quantity);
    }

    const receivedCountByRateId = new Map<string, number>();

    const cleanedParticipants = participantsInput.map((participant) => {
      const rateId = cleanString(participant.rateId);
      const firstName = cleanString(participant.firstName);
      const lastName = cleanString(participant.lastName);

      receivedCountByRateId.set(
        rateId,
        (receivedCountByRateId.get(rateId) || 0) + 1
      );

      return {
        rateId,
        firstName,
        lastName,
      };
    });

    const invalidParticipant = cleanedParticipants.some((participant) => {
      const rateExists = preparedLines.some(
        (line) => line.rateId === participant.rateId
      );

      return (
        !rateExists ||
        !participant.firstName ||
        !participant.lastName
      );
    });

    if (invalidParticipant) {
      return NextResponse.json(
        {
          error:
            "Chaque participant doit avoir un prénom, un nom et un tarif valide.",
        },
        { status: 400 }
      );
    }

    for (const [rateId, expectedCount] of expectedCountByRateId.entries()) {
      const receivedCount = receivedCountByRateId.get(rateId) || 0;

      if (receivedCount !== expectedCount) {
        return NextResponse.json(
          {
            error:
              "La répartition des participants ne correspond pas aux billets sélectionnés.",
          },
          { status: 400 }
        );
      }
    }

    const now = new Date().toISOString();
    const orderId = crypto.randomUUID();
    const reference = await makeUniqueReference();

    const subtotalAmount = preparedLines.reduce(
      (sum, line) => sum + line.lineTotal,
      0
    );

    const finalExtraDonationAmount = event.allowExtraDonation
      ? extraDonationAmount
      : 0;

    const totalAmount = subtotalAmount + finalExtraDonationAmount;

    const participants: TicketingParticipant[] = cleanedParticipants.map(
      (participant) => ({
        id: crypto.randomUUID(),
        eventId: event.id,
        rateId: participant.rateId,
        firstName: participant.firstName,
        lastName: participant.lastName,
        answers: {},
        createdAt: now,
        updatedAt: now,
      })
    );

    const order: TicketingOrder = {
      id: orderId,
      eventId: event.id,
      reference,
      payerFirstName: payer.firstName,
      payerLastName: payer.lastName,
      payerEmail: payer.email,
      payerPhone: payer.phone,
      participants,
      subtotalAmount,
      extraDonationAmount: finalExtraDonationAmount,
      totalAmount,
      currency: "eur",
      paymentStatus: "pending",
      stripeSessionId: undefined,
      stripePaymentIntentId: undefined,
      confirmationEmailSentAt: undefined,
      adminNotificationSentAt: undefined,
      createdAt: now,
      updatedAt: now,
    };

    await storage.saveTicketingOrder(order);

    return NextResponse.json({
      ok: true,
      order: {
        id: order.id,
        reference: order.reference,
        paymentStatus: order.paymentStatus,
        subtotalAmount: order.subtotalAmount,
        extraDonationAmount: order.extraDonationAmount,
        totalAmount: order.totalAmount,
        currency: order.currency,
        createdAt: order.createdAt,
      },
      event: {
        id: event.id,
        slug: event.slug,
        title: event.title,
      },
      payer,
      lines: preparedLines,
      participants: participants.map((participant) => ({
        id: participant.id,
        rateId: participant.rateId,
        firstName: participant.firstName,
        lastName: participant.lastName,
      })),
      message:
        "Inscription test créée en statut pending. Aucun paiement n’a été lancé.",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Impossible de créer cette inscription test.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}