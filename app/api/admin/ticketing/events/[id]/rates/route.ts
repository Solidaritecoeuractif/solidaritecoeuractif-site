import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type { TicketingRate, TicketingRateType } from "@/lib/ticketing/types";

function normalizeRateType(value: unknown): TicketingRateType {
  if (value === "free_amount") return "free_amount";
  if (value === "free") return "free";
  return "fixed";
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
      const name = String(entry.name || "").trim() || "Tarif sans nom";

      return {
        id: String(entry.id || "").trim() || crypto.randomUUID(),
        eventId: id,
        name,
        description: String(entry.description || "").trim() || undefined,
        type,
        amount: type === "fixed" ? toCents(entry.amount) : undefined,
        minimumAmount:
          type === "free_amount" ? toCents(entry.minimumAmount) : undefined,
        isActive: Boolean(entry.isActive),
        totalQuantityLimit: toOptionalNumber(entry.totalLimit),
        quantityPerOrderLimit: toOptionalNumber(entry.perOrderLimit),
        createdAt: String(entry.createdAt || "").trim() || now,
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