import { NextResponse } from "next/server";
import { getOrganizerSession } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { ticketingStorage } from "@/lib/ticketing";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      reference: string;
    }>;
  }
) {
  try {
    const session = await getOrganizerSession();

    if (!session) {
      return NextResponse.json(
        { error: "Connexion organisateur requise." },
        { status: 401 }
      );
    }

    const { id: eventId, reference } = await params;
    const storage = ticketingStorage();

    const organizer = await storage.getTicketingOrganizerAccountById(
      session.organizerId
    );

    if (!organizer || organizer.status !== "active") {
      return NextResponse.json(
        { error: "Compte organisateur inactif ou introuvable." },
        { status: 403 }
      );
    }

    const event = await storage.getTicketingEventById(eventId);

    if (!event || event.ownerOrganizerId !== organizer.id) {
      return NextResponse.json(
        { error: "Billetterie introuvable ou non autorisée." },
        { status: 404 }
      );
    }

    const order = await storage.getTicketingOrderByReference(reference);

    if (!order || order.eventId !== event.id) {
      return NextResponse.json(
        { error: "Inscription introuvable pour cette billetterie." },
        { status: 404 }
      );
    }

    if (order.paymentStatus !== "paid") {
      return NextResponse.json(
        { error: "Cette inscription n’est pas dans un état remboursable." },
        { status: 400 }
      );
    }

    if (!order.stripePaymentIntentId) {
      return NextResponse.json(
        {
          error:
            "Impossible de rembourser cette inscription : identifiant de paiement Stripe manquant.",
        },
        { status: 400 }
      );
    }

    await stripe().refunds.create({
      payment_intent: order.stripePaymentIntentId,
    });

    const now = new Date().toISOString();

    order.paymentStatus = "cancelled";
    order.updatedAt = now;

    await storage.updateTicketingOrder(order.reference, order);

    return NextResponse.json({
      ok: true,
      reference: order.reference,
      message: "Remboursement effectué. L’inscription a été annulée.",
    });
  } catch (error) {
    console.error("Erreur remboursement inscription billetterie", error);

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de rembourser cette inscription.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}