import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type { TicketingRate, TicketingRateType } from "@/lib/ticketing/types";

function normalizeRateType(value: unknown): TicketingRateType {
  if (value === "free_amount") return "free_amount";
  if (value === "free") return "free";
  return "fixed";
}

function cleanString(value: unknown) {
  return String(value || "").trim();
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

function normalizePercent(value: unknown) {
  const number = Number(String(value || "").trim());

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizePromoCode(value: unknown) {
  return cleanString(value).toUpperCase();
}

function booleanFromUnknown(value: unknown) {
  if (value === true) return true;
  if (value === "true") return true;
  if (value === "yes") return true;
  if (value === "1") return true;
  if (value === 1) return true;
  return false;
}

export async function PUT(
  request: Request,
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

    const payload = await request.json();

    if (!Array.isArray(payload.rates)) {
      return NextResponse.json(
        { error: "La liste des tarifs est invalide." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const rates: TicketingRate[] = payload.rates.map((entry: any) => {
      const type = normalizeRateType(entry.type);
      const name = cleanString(entry.name) || "Tarif sans nom";

      const promoCode = normalizePromoCode(entry.promoCode);
      const promoDiscountPercent = normalizePercent(
        entry.promoDiscountPercent
      );

      // Sécurité : si un code et un pourcentage existent, le code promo reste activé.
      const hasValidPromoData = Boolean(promoCode) && promoDiscountPercent > 0;

      const promoCodeEnabled =
        booleanFromUnknown(entry.promoCodeEnabled) || hasValidPromoData;

      const promoCodePublic =
        booleanFromUnknown(entry.promoCodePublic) ||
        booleanFromUnknown(entry.promoPublic) ||
        booleanFromUnknown(entry.isPromoPublic);

      const finalPromoEnabled = promoCodeEnabled && hasValidPromoData;

      return {
        id: cleanString(entry.id) || crypto.randomUUID(),
        eventId: id,
        name,
        description: cleanString(entry.description) || undefined,
        type,
        amount: type === "fixed" ? toCents(entry.amount) : undefined,
        minimumAmount:
          type === "free_amount" ? toCents(entry.minimumAmount) : undefined,
        isActive: booleanFromUnknown(entry.isActive),
        totalQuantityLimit: toOptionalNumber(entry.totalLimit),
        quantityPerOrderLimit: toOptionalNumber(entry.perOrderLimit),

        promoCodeEnabled: finalPromoEnabled,
        promoCodePublic: finalPromoEnabled ? promoCodePublic : false,
        promoCode: finalPromoEnabled ? promoCode : undefined,
        promoDiscountPercent: finalPromoEnabled ? promoDiscountPercent : 0,

        createdAt: cleanString(entry.createdAt) || now,
        updatedAt: now,
      };
    });

    await storage.replaceTicketingRates(id, rates);

    return NextResponse.json({
      ok: true,
      rates,
    });
  } catch (error) {
    console.error("Erreur modification tarifs billetterie", error);

    return NextResponse.json(
      {
        error:
          "Impossible de modifier les tarifs de cette billetterie. Vérifie les informations puis réessaie.",
      },
      { status: 500 }
    );
  }
}