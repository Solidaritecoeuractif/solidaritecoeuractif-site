import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";

function cleanString(value: unknown) {
  return String(value || "").trim();
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const action = cleanString(payload.action);

    const storage = ticketingStorage();
    const event = await storage.getTicketingEventById(id);

    if (!event) {
      return NextResponse.json(
        { error: "Billetterie introuvable." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const nextEvent = {
      ...event,
      updatedAt: now,
    };

    if (action === "publish") {
      nextEvent.status = "published" as const;
      nextEvent.isVisible = true;
    } else if (action === "hide") {
      nextEvent.status = "hidden" as const;
      nextEvent.isVisible = false;
    } else if (action === "archive") {
      nextEvent.status = "archived" as const;
      nextEvent.isVisible = false;
    } else {
      return NextResponse.json(
        { error: "Action invalide." },
        { status: 400 }
      );
    }

    await storage.updateTicketingEvent(event.id, nextEvent);

    return NextResponse.json({
      ok: true,
      event: nextEvent,
      message: "Statut de la billetterie modifié.",
    });
  } catch (error) {
    console.error("Erreur modification statut billetterie", error);

    return NextResponse.json(
      { error: "Impossible de modifier le statut de cette billetterie." },
      { status: 500 }
    );
  }
}