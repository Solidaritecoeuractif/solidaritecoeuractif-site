import { NextResponse } from "next/server";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";
import type {
  TicketingCustomField,
  TicketingCustomFieldType,
} from "@/lib/ticketing/types";

type FieldInput = {
  id?: string;
  label?: string;
  fieldKey?: string;
  type?: TicketingCustomFieldType;
  isRequired?: boolean;
  isActive?: boolean;
  options?: string | string[];
  position?: string | number;
  createdAt?: string;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function slugifyFieldKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeFieldType(value: unknown): TicketingCustomFieldType {
  if (value === "long_text") return "long_text";
  if (value === "email") return "email";
  if (value === "phone") return "phone";
  if (value === "number") return "number";
  if (value === "date") return "date";
  if (value === "select") return "select";
  if (value === "checkbox") return "checkbox";
  return "short_text";
}

function normalizeOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanText(item)).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizePosition(value: unknown, fallback: number) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, Math.floor(number));
}

async function getAuthorizedOrganizerEvent(eventId: string) {
  const session = await getOrganizerSession();

  if (!session) {
    return {
      error: NextResponse.json(
        { error: "Connexion organisateur requise." },
        { status: 401 }
      ),
    };
  }

  const storage = ticketingStorage();

  const organizer = await storage.getTicketingOrganizerAccountById(
    session.organizerId
  );

  if (!organizer || organizer.status !== "active") {
    return {
      error: NextResponse.json(
        { error: "Compte organisateur inactif ou introuvable." },
        { status: 403 }
      ),
    };
  }

  const event = await storage.getTicketingEventById(eventId);

  if (!event || event.ownerOrganizerId !== organizer.id) {
    return {
      error: NextResponse.json(
        { error: "Billetterie introuvable ou non autorisée." },
        { status: 404 }
      ),
    };
  }

  return {
    storage,
    event,
  };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authorization = await getAuthorizedOrganizerEvent(id);

    if (authorization.error) {
      return authorization.error;
    }

    const { storage, event } = authorization;
    const payload = await request.json();

    const fieldsInput: FieldInput[] = Array.isArray(payload.fields)
      ? payload.fields
      : [];

    const now = new Date().toISOString();

    for (const field of fieldsInput) {
      if (!cleanText(field.label)) {
        return NextResponse.json(
          {
            error:
              "Le nom de chaque information complémentaire est obligatoire.",
          },
          { status: 400 }
        );
      }
    }

    const fields: TicketingCustomField[] = fieldsInput.map((field, index) => {
      const label = cleanText(field.label);
      const fieldKey =
        slugifyFieldKey(cleanText(field.fieldKey)) ||
        slugifyFieldKey(label) ||
        `champ_${crypto.randomUUID().slice(0, 8)}`;

      return {
        id: cleanText(field.id) || crypto.randomUUID(),
        eventId: event.id,
        label,
        fieldKey,
        type: normalizeFieldType(field.type),
        target: "participant",
        isRequired: Boolean(field.isRequired),
        isActive: field.isActive !== false,
        appliesToRateIds: undefined,
        options: normalizeOptions(field.options),
        position: normalizePosition(field.position, index),
        createdAt: cleanText(field.createdAt) || now,
        updatedAt: now,
      };
    });

    const duplicatedKeys = fields
      .map((field) => field.fieldKey)
      .filter((fieldKey, index, all) => all.indexOf(fieldKey) !== index);

    if (duplicatedKeys.length > 0) {
      return NextResponse.json(
        {
          error:
            "Deux informations complémentaires utilisent la même clé technique.",
        },
        { status: 400 }
      );
    }

    const savedFields = await storage.replaceTicketingCustomFields(
      event.id,
      fields
    );

    return NextResponse.json({
      ok: true,
      fields: savedFields,
    });
  } catch (error) {
    console.error(
      "Erreur modification champs complémentaires organisateur",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Impossible d’enregistrer les informations complémentaires.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}