import { NextResponse } from "next/server";
import { saveTicketingEvent, replaceTicketingRates } from "@/lib/ticketing/storage";
import type { TicketingEvent, TicketingRate } from "@/lib/ticketing/types";

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
  const normalized = String(value || "")
    .replace(",", ".")
    .trim();

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

export async function POST(request: Request) {
  const isProduction =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

  if (isProduction) {
    return NextResponse.json(
      {
        error:
          "La sauvegarde locale de maquette est désactivée en production. La sauvegarde définitive sera branchée ensuite sur Postgres.",
      },
      { status: 403 }
    );
  }

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

  const event: TicketingEvent = {
    id: eventId,
    slug: slugify(title) || eventId,
    title,
    formTypeLabel: String(payload.formTypeLabel || "").trim() || undefined,
    status: payload.isVisible ? "published" : "draft",
    isVisible: Boolean(payload.isVisible),
    locationName: String(payload.locationName || "").trim() || undefined,
    addressLine: String(payload.addressLine || "").trim() || undefined,
    postalCode: String(payload.postalCode || "").trim() || undefined,
    city: String(payload.city || "").trim() || undefined,
    country: String(payload.country || "").trim() || undefined,
    durationType: payload.durationType || "none",
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
    ? payload.rates.map((rate: any) => ({
        id: crypto.randomUUID(),
        eventId,
        name: String(rate.name || "").trim() || "Tarif sans nom",
        description: undefined,
        type: rate.type || "fixed",
        amount: rate.type === "fixed" ? toCents(rate.amount) : undefined,
        minimumAmount:
          rate.type === "free_amount" ? toCents(rate.minimumAmount) : undefined,
        isActive: Boolean(rate.isActive),
        totalQuantityLimit: toOptionalNumber(rate.totalLimit),
        quantityPerOrderLimit: toOptionalNumber(rate.perOrderLimit),
        createdAt: now,
        updatedAt: now,
      }))
    : [];

  await saveTicketingEvent(event);
  await replaceTicketingRates(eventId, rates);

  return NextResponse.json({
    ok: true,
    event,
    rates,
  });
}