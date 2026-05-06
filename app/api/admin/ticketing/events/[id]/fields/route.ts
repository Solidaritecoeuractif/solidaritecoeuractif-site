import { NextResponse } from "next/server";
import { ticketingStorage } from "@/lib/ticketing";
import type {
  TicketingCustomField,
  TicketingCustomFieldType,
} from "@/lib/ticketing/types";

function cleanString(value: unknown) {
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

function parseOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanString(item)).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

    if (!Array.isArray(payload.fields)) {
      return NextResponse.json(
        { error: "La liste des champs est invalide." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const fields: TicketingCustomField[] = payload.fields.map(
      (entry: any, index: number) => {
        const label = cleanString(entry.label) || "Champ sans nom";
        const fieldKey =
          cleanString(entry.fieldKey) ||
          slugifyFieldKey(label) ||
          `champ_${crypto.randomUUID().slice(0, 8)}`;

        return {
          id: cleanString(entry.id) || crypto.randomUUID(),
          eventId: id,
          label,
          fieldKey,
          type: normalizeFieldType(entry.type),

          // Toutes les informations complémentaires concernent les participants.
          target: "participant",

          isRequired: Boolean(entry.isRequired),
          isActive:
            typeof entry.isActive === "boolean" ? entry.isActive : true,

          appliesToRateIds: undefined,
          options: parseOptions(entry.options),

          position: Number.isFinite(Number(entry.position))
            ? Number(entry.position)
            : index,

          createdAt: cleanString(entry.createdAt) || now,
          updatedAt: now,
        };
      }
    );

    await storage.replaceTicketingCustomFields(id, fields);

    return NextResponse.json({
      ok: true,
      fields,
    });
  } catch (error) {
    console.error("Erreur modification champs complémentaires", error);

    return NextResponse.json(
      {
        error:
          "Impossible de modifier les informations complémentaires de cette billetterie.",
      },
      { status: 500 }
    );
  }
}