import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type { TicketingDurationType, TicketingEvent } from "@/lib/ticketing/types";

function normalizeDurationType(value: unknown): TicketingDurationType {
  if (value === "one_day") return "one_day";
  if (value === "several_days") return "several_days";
  return "none";
}

function normalizeSuggestedDonationAmounts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((amount) => Number(amount))
    .filter((amount) => Number.isFinite(amount) && amount > 0)
    .map((amount) => Math.round(amount));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const storage = ticketingStorage();

    const existingEvent = await storage.getTicketingEventById(id);

    if (!existingEvent) {
      return NextResponse.json(
        { error: "Billetterie introuvable." },
        { status: 404 }
      );
    }

    const payload = await request.json();
    const now = new Date().toISOString();

    const isVisible = Boolean(payload.isVisible);

    const updatedEvent: TicketingEvent = {
      ...existingEvent,

      title: String(payload.title || "").trim() || existingEvent.title,
      formTypeLabel:
        String(payload.formTypeLabel || "").trim() ||
        existingEvent.formTypeLabel,

      status: isVisible ? "published" : "draft",
      isVisible,

      locationName:
        String(payload.locationName || "").trim() || undefined,
      addressLine:
        String(payload.addressLine || "").trim() || undefined,
      postalCode:
        String(payload.postalCode || "").trim() || undefined,
      city:
        String(payload.city || "").trim() || undefined,
      country:
        String(payload.country || "").trim() || undefined,

      durationType: normalizeDurationType(payload.durationType),
      startsAt:
        String(payload.startsAt || "").trim() || undefined,
      endsAt:
        String(payload.endsAt || "").trim() || undefined,

      organizerEmail:
        String(payload.organizerEmail || "").trim() || undefined,
      organizerPhone:
        String(payload.organizerPhone || "").trim() || undefined,

      shortDescription:
        String(payload.shortDescription || "").trim() || undefined,

      allowExtraDonation: Boolean(payload.allowExtraDonation),
      suggestedDonationAmounts: normalizeSuggestedDonationAmounts(
        payload.suggestedDonationAmounts
      ),

      updatedAt: now,
    };

    if (!updatedEvent.title.trim()) {
      return NextResponse.json(
        { error: "Le nom de la billetterie est obligatoire." },
        { status: 400 }
      );
    }

    await storage.updateTicketingEvent(id, updatedEvent);

    return NextResponse.json({
      ok: true,
      event: updatedEvent,
    });
  } catch (error) {
    console.error("Erreur modification billetterie", error);

    return NextResponse.json(
      {
        error:
          "Impossible de modifier la billetterie. Vérifie les informations puis réessaie.",
      },
      { status: 500 }
    );
  }
}