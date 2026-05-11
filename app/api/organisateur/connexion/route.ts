import { NextResponse } from "next/server";
import { createOrganizerSession, verifyPassword } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";

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

    const email = cleanEmail(payload.email);
    const password = String(payload.password || "");

    if (!email || !isValidEmail(email) || !password) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 400 }
      );
    }

    const storage = ticketingStorage();
    const organizer = await storage.getTicketingOrganizerAccountByEmail(email);

    if (!organizer || !verifyPassword(password, organizer.passwordHash)) {
      return NextResponse.json(
        { error: "Email ou mot de passe incorrect." },
        { status: 401 }
      );
    }

    if (organizer.status !== "active") {
      return NextResponse.json(
        {
          error:
            "Ce compte organisateur n’est pas actif. Contacte l’administrateur de la plateforme.",
        },
        { status: 403 }
      );
    }

    if (!organizer.canCreateEvents) {
      return NextResponse.json(
        {
          error:
            "Ce compte organisateur n’est pas autorisé à créer des billetteries.",
        },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();

    await storage.updateTicketingOrganizerAccount(organizer.id, {
      ...organizer,
      lastLoginAt: now,
      updatedAt: now,
    });

    await createOrganizerSession(organizer.id);

    return NextResponse.json({
      ok: true,
      redirectTo: "/organisateur/billetteries",
    });
  } catch (error) {
    console.error("Erreur connexion organisateur", error);

    return NextResponse.json(
      { error: "Impossible de connecter l’organisateur." },
      { status: 500 }
    );
  }
}