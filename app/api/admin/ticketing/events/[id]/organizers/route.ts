import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type { TicketingCollaboratorAccess } from "@/lib/ticketing/types";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeStatus(value: unknown): TicketingCollaboratorAccess["status"] {
  if (value === "active") return "active";
  if (value === "blocked") return "blocked";
  if (value === "deleted") return "deleted";
  return "pending_validation";
}

function toBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

export async function GET(
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

    const organizers = await storage.getTicketingCollaboratorAccesses(event.id);

    return NextResponse.json({
      ok: true,
      organizers,
    });
  } catch (error) {
    console.error("Erreur chargement accès organisateurs", error);

    return NextResponse.json(
      { error: "Impossible de charger les accès organisateurs." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await request.json();

    const storage = ticketingStorage();
    const event = await storage.getTicketingEventById(id);

    if (!event) {
      return NextResponse.json(
        { error: "Billetterie introuvable." },
        { status: 404 }
      );
    }

    const email = cleanEmail(payload.email);
    const displayName = cleanText(payload.displayName);

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "L’email de l’organisateur est obligatoire et doit être valide." },
        { status: 400 }
      );
    }

    const existingAccesses = await storage.getTicketingCollaboratorAccesses(
      event.id
    );

    const alreadyExists = existingAccesses.some(
      (access) =>
        access.email.toLowerCase() === email && access.status !== "deleted"
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "Cet organisateur a déjà un accès pour cette billetterie." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const access: TicketingCollaboratorAccess = {
      id: crypto.randomUUID(),
      eventId: event.id,
      email,
      displayName: displayName || undefined,
      passwordHash: undefined,
      status: normalizeStatus(payload.status),
      canEditEvent: toBoolean(payload.canEditEvent, true),
      canEditRates: toBoolean(payload.canEditRates, true),
      canViewParticipants: toBoolean(payload.canViewParticipants, true),
      canReceiveNotifications: toBoolean(
        payload.canReceiveNotifications,
        true
      ),
      validatedAt: payload.status === "active" ? now : undefined,
      blockedAt: undefined,
      deletedAt: undefined,
      lastLoginAt: undefined,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await storage.saveTicketingCollaboratorAccess(access);

    return NextResponse.json({
      ok: true,
      organizer: saved,
    });
  } catch (error) {
    console.error("Erreur création accès organisateur", error);

    return NextResponse.json(
      { error: "Impossible de créer l’accès organisateur." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const payload = await request.json();

    const storage = ticketingStorage();
    const event = await storage.getTicketingEventById(id);

    if (!event) {
      return NextResponse.json(
        { error: "Billetterie introuvable." },
        { status: 404 }
      );
    }

    const accessId = cleanText(payload.id);

    if (!accessId) {
      return NextResponse.json(
        { error: "Accès organisateur introuvable." },
        { status: 400 }
      );
    }

    const accesses = await storage.getTicketingCollaboratorAccesses(event.id);
    const existing = accesses.find((access) => access.id === accessId);

    if (!existing) {
      return NextResponse.json(
        { error: "Accès organisateur introuvable." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const nextStatus = normalizeStatus(payload.status);

    const updated: TicketingCollaboratorAccess = {
      ...existing,
      displayName: cleanText(payload.displayName) || undefined,
      status: nextStatus,
      canEditEvent: toBoolean(payload.canEditEvent, existing.canEditEvent),
      canEditRates: toBoolean(payload.canEditRates, existing.canEditRates),
      canViewParticipants: toBoolean(
        payload.canViewParticipants,
        existing.canViewParticipants
      ),
      canReceiveNotifications: toBoolean(
        payload.canReceiveNotifications,
        existing.canReceiveNotifications
      ),
      validatedAt:
        nextStatus === "active" && !existing.validatedAt
          ? now
          : existing.validatedAt,
      blockedAt:
        nextStatus === "blocked"
          ? now
          : nextStatus === "active"
            ? undefined
            : existing.blockedAt,
      deletedAt: nextStatus === "deleted" ? now : existing.deletedAt,
      updatedAt: now,
    };

    const saved = await storage.updateTicketingCollaboratorAccess(
      existing.id,
      updated
    );

    return NextResponse.json({
      ok: true,
      organizer: saved,
    });
  } catch (error) {
    console.error("Erreur modification accès organisateur", error);

    return NextResponse.json(
      { error: "Impossible de modifier l’accès organisateur." },
      { status: 500 }
    );
  }
}