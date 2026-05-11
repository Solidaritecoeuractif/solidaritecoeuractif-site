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

function normalizeContributionPercent(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(10, Math.round(number)));
}

function cleanOptionalText(value: unknown) {
  const cleaned = String(value || "").trim();
  return cleaned || undefined;
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

      locationName: cleanOptionalText(payload.locationName),
      addressLine: cleanOptionalText(payload.addressLine),
      postalCode: cleanOptionalText(payload.postalCode),
      city: cleanOptionalText(payload.city),
      country: cleanOptionalText(payload.country),

      durationType: normalizeDurationType(payload.durationType),
      startsAt: cleanOptionalText(payload.startsAt),
      endsAt: cleanOptionalText(payload.endsAt),

      organizerEmail: cleanOptionalText(payload.organizerEmail),
      organizerPhone: cleanOptionalText(payload.organizerPhone),

      shortDescription: cleanOptionalText(payload.shortDescription),

      allowExtraDonation: Boolean(payload.allowExtraDonation),

      /**
       * Ancien champ conservé pour compatibilité.
       * La nouvelle configuration se fait avec extraDonationSuggestedPercent.
       */
      suggestedDonationAmounts: normalizeSuggestedDonationAmounts(
        payload.suggestedDonationAmounts ?? existingEvent.suggestedDonationAmounts
      ),

      extraDonationSuggestedPercent: normalizeContributionPercent(
        payload.extraDonationSuggestedPercent
      ),

      confirmationEmailEnabled: payload.confirmationEmailEnabled !== false,
      confirmationEmailSubject: cleanOptionalText(
        payload.confirmationEmailSubject
      ),
      confirmationEmailMessage: cleanOptionalText(
        payload.confirmationEmailMessage
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