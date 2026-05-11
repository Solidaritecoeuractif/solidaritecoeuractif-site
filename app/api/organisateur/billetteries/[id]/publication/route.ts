import { NextResponse } from "next/server";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";
import type { TicketingEvent } from "@/lib/ticketing/types";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

async function authorizeOrganizerEvent(eventId: string) {
  const session = await getOrganizerSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Connexion organisateur requise." },
        { status: 401 }
      ),
    };
  }

  const storage = ticketingStorage();

  const organizer = await storage.getTicketingOrganizerAccountById(
    session.organizerId
  );

  if (!organizer || organizer.status !== "active") {
    return {
      error: NextResponse.json(
        { error: "Compte organisateur inactif ou introuvable." },
        { status: 403 }
      ),
    };
  }

  const event = await storage.getTicketingEventById(eventId);

  if (!event || event.ownerOrganizerId !== organizer.id) {
    return {
      error: NextResponse.json(
        { error: "Billetterie introuvable ou non autorisée." },
        { status: 404 }
      ),
    };
  }

  return {
    storage,
    event,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authorization = await authorizeOrganizerEvent(id);

    if (authorization.error) {
      return authorization.error;
    }

    const { storage, event } = authorization;
    const payload = await request.json();

    const action = cleanText(payload.action);
    const now = new Date().toISOString();

    let updatedEvent: TicketingEvent;

    if (action === "publish") {
      updatedEvent = {
        ...event,
        status: "published",
        isVisible: true,
        updatedAt: now,
      };
    } else if (action === "hide") {
      updatedEvent = {
        ...event,
        status: "hidden",
        isVisible: false,
        updatedAt: now,
      };
    } else {
      return NextResponse.json(
        { error: "Action de publication invalide." },
        { status: 400 }
      );
    }

    await storage.updateTicketingEvent(event.id, updatedEvent);

    return NextResponse.json({
      ok: true,
      event: updatedEvent,
      publicUrl: `/evenements/${updatedEvent.slug}`,
    });
  } catch (error) {
    console.error("Erreur publication billetterie organisateur", error);

    return NextResponse.json(
      { error: "Impossible de modifier la publication de cette billetterie." },
      { status: 500 }
    );
  }
}