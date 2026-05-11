import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type {
  TicketingAccessStatus,
  TicketingOrganizerAccount,
} from "@/lib/ticketing/types";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeStatus(value: unknown): TicketingAccessStatus {
  if (value === "active") return "active";
  if (value === "blocked") return "blocked";
  if (value === "deleted") return "deleted";
  return "pending_validation";
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

export async function GET() {
  try {
    const organizers = await ticketingStorage().getTicketingOrganizerAccounts();

    return NextResponse.json({
      ok: true,
      organizers,
    });
  } catch (error) {
    console.error("Erreur chargement organisateurs plateforme", error);

    return NextResponse.json(
      { error: "Impossible de charger les organisateurs de la plateforme." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const storage = ticketingStorage();

    const email = cleanEmail(payload.email);
    const displayName = cleanText(payload.displayName);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "L’email de l’organisateur est obligatoire et doit être valide." },
        { status: 400 }
      );
    }

    const existing = await storage.getTicketingOrganizerAccountByEmail(email);

    if (existing) {
      return NextResponse.json(
        { error: "Un organisateur existe déjà avec cet email." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const status = normalizeStatus(payload.status);

    const account: TicketingOrganizerAccount = {
      id: crypto.randomUUID(),
      email,
      displayName: displayName || undefined,
      passwordHash: undefined,
      status,
      canCreateEvents: toBoolean(payload.canCreateEvents, true),
      canReceiveNotifications: toBoolean(
        payload.canReceiveNotifications,
        true
      ),
      validatedAt: status === "active" ? now : undefined,
      blockedAt: undefined,
      deletedAt: undefined,
      lastLoginAt: undefined,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await storage.saveTicketingOrganizerAccount(account);

    return NextResponse.json({
      ok: true,
      organizer: saved,
    });
  } catch (error) {
    console.error("Erreur création organisateur plateforme", error);

    return NextResponse.json(
      { error: "Impossible de créer cet organisateur." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = await request.json();
    const storage = ticketingStorage();

    const id = cleanText(payload.id);

    if (!id) {
      return NextResponse.json(
        { error: "Compte organisateur introuvable." },
        { status: 400 }
      );
    }

    const existing = await storage.getTicketingOrganizerAccountById(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Compte organisateur introuvable." },
        { status: 404 }
      );
    }

    const email = cleanEmail(payload.email || existing.email);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "L’email de l’organisateur est obligatoire et doit être valide." },
        { status: 400 }
      );
    }

    const duplicate = await storage.getTicketingOrganizerAccountByEmail(email);

    if (duplicate && duplicate.id !== existing.id) {
      return NextResponse.json(
        { error: "Un autre organisateur utilise déjà cet email." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const status = normalizeStatus(payload.status);

    const updated: TicketingOrganizerAccount = {
      ...existing,
      email,
      displayName: cleanText(payload.displayName) || undefined,
      status,
      canCreateEvents: toBoolean(
        payload.canCreateEvents,
        existing.canCreateEvents
      ),
      canReceiveNotifications: toBoolean(
        payload.canReceiveNotifications,
        existing.canReceiveNotifications
      ),
      validatedAt:
        status === "active" && !existing.validatedAt
          ? now
          : existing.validatedAt,
      blockedAt:
        status === "blocked"
          ? now
          : status === "active"
            ? undefined
            : existing.blockedAt,
      deletedAt: status === "deleted" ? now : existing.deletedAt,
      updatedAt: now,
    };

    const saved = await storage.updateTicketingOrganizerAccount(
      existing.id,
      updated
    );

    return NextResponse.json({
      ok: true,
      organizer: saved,
    });
  } catch (error) {
    console.error("Erreur modification organisateur plateforme", error);

    return NextResponse.json(
      { error: "Impossible de modifier cet organisateur." },
      { status: 500 }
    );
  }
}