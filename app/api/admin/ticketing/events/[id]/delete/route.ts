import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const storage = ticketingStorage();
    const event = await storage.getTicketingEventById(id);

    if (!event) {
      return NextResponse.json(
        { error: "Billetterie introuvable." },
        { status: 404 }
      );
    }

    const orders = await storage.getTicketingOrders(event.id);

    if (orders.length > 0) {
      return NextResponse.json(
        {
          error:
            "Suppression bloquée : cette billetterie contient déjà des inscriptions. Vous pouvez la masquer ou l’archiver, mais elle ne doit pas être supprimée définitivement.",
        },
        { status: 409 }
      );
    }

    await storage.deleteTicketingEvent(event.id);

    return NextResponse.json({
      ok: true,
      message: "Billetterie supprimée définitivement.",
    });
  } catch (error) {
    console.error("Erreur suppression billetterie", error);

    return NextResponse.json(
      { error: "Impossible de supprimer cette billetterie." },
      { status: 500 }
    );
  }
}