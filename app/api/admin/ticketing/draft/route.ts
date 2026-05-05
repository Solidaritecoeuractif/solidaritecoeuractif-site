import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type {
  TicketingDurationType,
  TicketingEvent,
  TicketingRate,
  TicketingRateType,
} from "@/lib/ticketing/types";

function slugify(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toCents(value: unknown) {
  const normalized = String(value || "").replace(",", ".").trim();
  const number = Number(normalized);

  if (!Number.isFinite(number) || number < 0) {
    return undefined;
  }

  return Math.round(number * 100);
}

function toOptionalNumber(value: unknown) {
  const number = Number(String(value || "").trim());

  if (!Number.isFinite(number) || number <= 0) {
    return undefined;
  }

  return Math.floor(number);
}

function normalizeDurationType(value: unknown): TicketingDurationType {
  if (value === "one_day") return "one_day";
  if (value === "several_days") return "several_days";
  return "none";
}

function normalizeRateType(value: unknown): TicketingRateType {
  if (value === "free_amount") return "free_amount";
  if (value === "free") return "free";
  return "fixed";
}

async function makeUniqueSlug(baseSlug: string) {
  const storage = ticketingStorage();
  const fallback = `billetterie-${Date.now()}`;
  const cleanBase = baseSlug || fallback;

  let slug = cleanBase;
  let index = 2;

  while (await storage.getTicketingEventBySlug(slug)) {
    slug = `${cleanBase}-${index}`;
    index += 1;
  }

  return slug;
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const now = new Date().toISOString();
    const eventId = crypto.randomUUID();
    const title = String(payload.title || "").trim();

    if (!title) {
      return NextResponse.json(
        { error: "Le nom de la billetterie est obligatoire." },
        { status: 400 }
      );
    }

    const slug = await makeUniqueSlug(slugify(title));

    const event: TicketingEvent = {
      id: eventId,
      slug,
      title,
      formTypeLabel: String(payload.formTypeLabel || "").trim() || undefined,
      status: payload.isVisible ? "published" : "draft",
      isVisible: Boolean(payload.isVisible),

      locationName: String(payload.locationName || "").trim() || undefined,
      addressLine: String(payload.addressLine || "").trim() || undefined,
      postalCode: String(payload.postalCode || "").trim() || undefined,
      city: String(payload.city || "").trim() || undefined,
      country: String(payload.country || "").trim() || undefined,

      durationType: normalizeDurationType(payload.durationType),
      startsAt: String(payload.startsAt || "").trim() || undefined,
      endsAt: String(payload.endsAt || "").trim() || undefined,

      organizerEmail: String(payload.organizerEmail || "").trim() || undefined,
      organizerPhone: String(payload.organizerPhone || "").trim() || undefined,

      shortDescription:
        String(payload.shortDescription || "").trim() || undefined,
      longDescription: undefined,

      primaryColor: undefined,
      bannerImageUrl: undefined,
      thumbnailImageUrl: undefined,

      allowExtraDonation: Boolean(payload.allowExtraDonation),
      suggestedDonationAmounts: Array.isArray(payload.suggestedDonationAmounts)
        ? payload.suggestedDonationAmounts
        : [],

      totalParticipantLimit: undefined,
      salesOpenAt: undefined,
      salesCloseAt: undefined,

      createdAt: now,
      updatedAt: now,
    };

    const rates: TicketingRate[] = Array.isArray(payload.rates)
      ? payload.rates.map((rate: any) => {
          const type = normalizeRateType(rate.type);

          return {
            id: crypto.randomUUID(),
            eventId,
            name: String(rate.name || "").trim() || "Tarif sans nom",
            description: undefined,
            type,
            amount: type === "fixed" ? toCents(rate.amount) : undefined,
            minimumAmount:
              type === "free_amount" ? toCents(rate.minimumAmount) : undefined,
            isActive: Boolean(rate.isActive),
            totalQuantityLimit: toOptionalNumber(rate.totalLimit),
            quantityPerOrderLimit: toOptionalNumber(rate.perOrderLimit),
            createdAt: now,
            updatedAt: now,
          };
        })
      : [];

    const storage = ticketingStorage();

    await storage.saveTicketingEvent(event);
    await storage.replaceTicketingRates(eventId, rates);

    return NextResponse.json({
      ok: true,
      event,
      rates,
    });
  } catch (error) {
    console.error("Erreur création billetterie", error);

    return NextResponse.json(
      {
        error:
          "Impossible d’enregistrer la billetterie. Vérifie les informations puis réessaie.",
      },
      { status: 500 }
    );
  }
}