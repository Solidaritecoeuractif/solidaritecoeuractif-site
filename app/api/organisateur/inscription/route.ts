import { NextResponse } from "next/server";
import { createOrganizerSession, hashPassword } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";
import type { TicketingOrganizerAccount } from "@/lib/ticketing/types";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function cleanEmail(value: unknown) {
  return cleanText(value).toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const displayName = cleanText(payload.displayName);
    const email = cleanEmail(payload.email);
    const password = String(payload.password || "");
    const passwordConfirmation = String(payload.passwordConfirmation || "");

    if (!displayName) {
      return NextResponse.json(
        { error: "Le nom de l’organisateur ou de la structure est obligatoire." },
        { status: 400 }
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "L’adresse email est obligatoire et doit être valide." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caractères." },
        { status: 400 }
      );
    }

    if (password !== passwordConfirmation) {
      return NextResponse.json(
        { error: "Les deux mots de passe ne correspondent pas." },
        { status: 400 }
      );
    }

    const storage = ticketingStorage();
    const existing = await storage.getTicketingOrganizerAccountByEmail(email);

    if (existing) {
      return NextResponse.json(
        { error: "Un compte organisateur existe déjà avec cet email." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const organizer: TicketingOrganizerAccount = {
      id: crypto.randomUUID(),
      email,
      displayName,
      passwordHash: hashPassword(password),
      status: "active",
      canCreateEvents: true,
      canReceiveNotifications: true,
      validatedAt: now,
      blockedAt: undefined,
      deletedAt: undefined,
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await storage.saveTicketingOrganizerAccount(organizer);

    await createOrganizerSession(saved.id);

    return NextResponse.json({
      ok: true,
      redirectTo: "/organisateur/billetteries",
    });
  } catch (error) {
    console.error("Erreur inscription organisateur", error);

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de créer le compte organisateur.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}