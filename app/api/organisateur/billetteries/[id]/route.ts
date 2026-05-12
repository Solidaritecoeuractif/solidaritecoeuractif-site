import { NextResponse } from "next/server";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";
import type {
  TicketingDurationType,
  TicketingEvent,
  TicketingRate,
  TicketingRateType,
} from "@/lib/ticketing/types";

type DraftRateInput = {
  id?: string;
  name?: string;
  description?: string;
  type?: TicketingRateType;
  amount?: string | number;
  minimumAmount?: string | number;
  totalLimit?: string | number;
  perOrderLimit?: string | number;
  isActive?: boolean;
  promoCodeEnabled?: boolean;
  promoCodePublic?: boolean;
  promoCode?: string;
  promoDiscountPercent?: string | number;
  createdAt?: string;
};

function cleanText(value: unknown) {
  return String(value || "").trim();
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

function euroToCents(value: unknown) {
  const number = Number(String(value || "").replace(",", ".").trim());

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number * 100);
}

function optionalPositiveInteger(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return undefined;
  }

  return Math.floor(number);
}

function normalizePercent(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeImageDataUrl(value: unknown) {
  const text = cleanText(value);

  if (!text) return undefined;

  const isSupportedImage =
    text.startsWith("data:image/jpeg;base64,") ||
    text.startsWith("data:image/png;base64,") ||
    text.startsWith("data:image/webp;base64,");

  if (!isSupportedImage) {
    throw new Error(
      "L’image doit être au format JPG, PNG ou WebP."
    );
  }

  /**
   * Sécurité simple : on évite d’enregistrer une image trop lourde
   * directement dans la billetterie.
   */
  if (text.length > 1_200_000) {
    throw new Error(
      "L’image est trop lourde. Merci d’utiliser une image plus légère, idéalement moins de 700 Ko."
    );
  }

  return text;
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
    organizer,
    event,
  };
}

function normalizeRates(
  eventId: string,
  ratesInput: DraftRateInput[],
  now: string
): TicketingRate[] {
  return ratesInput.map((rateInput) => {
    const type = normalizeRateType(rateInput.type);
    const amount = euroToCents(rateInput.amount);
    const minimumAmount = euroToCents(rateInput.minimumAmount);

    if (!cleanText(rateInput.name)) {
      throw new Error("Chaque tarif doit avoir un nom.");
    }

    if (type === "fixed" && amount <= 0) {
      throw new Error(
        "Chaque tarif à prix fixe doit avoir un montant supérieur à 0 €."
      );
    }

    if (type === "free_amount" && minimumAmount <= 0) {
      throw new Error(
        "Chaque tarif à prix libre doit avoir un minimum supérieur à 0 €."
      );
    }

    return {
      id: cleanText(rateInput.id) || crypto.randomUUID(),
      eventId,
      name: cleanText(rateInput.name),
      description: cleanText(rateInput.description) || undefined,
      type,
      amount: type === "fixed" ? amount : undefined,
      minimumAmount: type === "free_amount" ? minimumAmount : undefined,
      isActive: rateInput.isActive !== false,
      totalQuantityLimit: optionalPositiveInteger(rateInput.totalLimit),
      quantityPerOrderLimit: optionalPositiveInteger(rateInput.perOrderLimit),

      promoCodeEnabled: Boolean(rateInput.promoCodeEnabled),
      promoCodePublic: Boolean(rateInput.promoCodeEnabled)
        ? Boolean(rateInput.promoCodePublic)
        : false,
      promoCode: cleanText(rateInput.promoCode).toUpperCase() || undefined,
      promoDiscountPercent: normalizePercent(rateInput.promoDiscountPercent),

      createdAt: cleanText(rateInput.createdAt) || now,
      updatedAt: now,
    };
  });
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
    const now = new Date().toISOString();

    const title = cleanText(payload.title);

    if (!title) {
      return NextResponse.json(
        { error: "Le nom de la billetterie est obligatoire." },
        { status: 400 }
      );
    }

    const ratesInput: DraftRateInput[] = Array.isArray(payload.rates)
      ? payload.rates
      : [];

    if (ratesInput.length === 0) {
      return NextResponse.json(
        { error: "Ajoute au moins un tarif." },
        { status: 400 }
      );
    }

    const updatedEvent: TicketingEvent = {
      ...event,

      title,
      formTypeLabel: cleanText(payload.formTypeLabel) || event.formTypeLabel,

      locationName: cleanText(payload.locationName) || undefined,
      addressLine: cleanText(payload.addressLine) || undefined,
      postalCode: cleanText(payload.postalCode) || undefined,
      city: cleanText(payload.city) || undefined,
      country: cleanText(payload.country) || undefined,

      durationType: normalizeDurationType(payload.durationType),
      startsAt: cleanText(payload.startsAt) || undefined,
      endsAt: cleanText(payload.endsAt) || undefined,

      organizerEmail: cleanText(payload.organizerEmail) || undefined,
      organizerPhone: cleanText(payload.organizerPhone) || undefined,

      shortDescription: cleanText(payload.shortDescription) || undefined,

      /**
       * Image / logo de la billetterie ajouté par l’organisateur.
       * On l’enregistre dans bannerImageUrl pour l’afficher sur la page publique.
       */
      bannerImageUrl: normalizeImageDataUrl(payload.bannerImageUrl),
      thumbnailImageUrl: normalizeImageDataUrl(payload.bannerImageUrl),

      confirmationEmailEnabled: payload.confirmationEmailEnabled !== false,
      confirmationEmailSubject:
        cleanText(payload.confirmationEmailSubject) || undefined,
      confirmationEmailMessage:
        cleanText(payload.confirmationEmailMessage) || undefined,

      // Sécurité : ces champs restent pilotés uniquement par l’admin général.
      allowExtraDonation: event.allowExtraDonation,
      suggestedDonationAmounts: event.suggestedDonationAmounts,
      extraDonationSuggestedPercent: event.extraDonationSuggestedPercent,

      ownerOrganizerId: event.ownerOrganizerId,

      updatedAt: now,
    };

    const rates = normalizeRates(event.id, ratesInput, now);

    await storage.updateTicketingEvent(event.id, updatedEvent);
    await storage.replaceTicketingRates(event.id, rates);

    return NextResponse.json({
      ok: true,
      event: updatedEvent,
      rates,
    });
  } catch (error) {
    console.error("Erreur modification billetterie organisateur", error);

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de modifier cette billetterie.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}