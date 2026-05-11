import { NextResponse } from "next/server";
import { getOrganizerSession } from "@/lib/auth";
import { ticketingStorage } from "@/lib/ticketing";
import type {
  TicketingDurationType,
  TicketingEvent,
  TicketingRate,
  TicketingRateType,
} from "@/lib/ticketing/types";

function cleanText(value: unknown) {
  return String(value || "").trim();
}

function slugify(value: string) {
  const base = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return base || `billetterie-${crypto.randomUUID().slice(0, 8)}`;
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

async function makeUniqueSlug(title: string) {
  const storage = ticketingStorage();
  const baseSlug = slugify(title);

  let slug = baseSlug;
  let counter = 2;

  while (await storage.getTicketingEventBySlug(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function POST(request: Request) {
  try {
    const session = await getOrganizerSession();

    if (!session) {
      return NextResponse.json(
        { error: "Connexion organisateur requise." },
        { status: 401 }
      );
    }

    const storage = ticketingStorage();
    const organizer = await storage.getTicketingOrganizerAccountById(
      session.organizerId
    );

    if (!organizer || organizer.status !== "active") {
      return NextResponse.json(
        { error: "Compte organisateur inactif ou introuvable." },
        { status: 403 }
      );
    }

    if (!organizer.canCreateEvents) {
      return NextResponse.json(
        { error: "Ce compte n’est pas autorisé à créer des billetteries." },
        { status: 403 }
      );
    }

    const payload = await request.json();

    const title = cleanText(payload.title);
    const formTypeLabel = cleanText(payload.formTypeLabel);
    const locationName = cleanText(payload.locationName);
    const addressLine = cleanText(payload.addressLine);
    const postalCode = cleanText(payload.postalCode);
    const city = cleanText(payload.city);
    const country = cleanText(payload.country);
    const shortDescription = cleanText(payload.shortDescription);
    const organizerEmail = cleanText(payload.organizerEmail) || organizer.email;
    const organizerPhone = cleanText(payload.organizerPhone);

    const durationType = normalizeDurationType(payload.durationType);
    const startsAt = cleanText(payload.startsAt);
    const endsAt = cleanText(payload.endsAt);

    const rateName = cleanText(payload.rateName);
    const rateDescription = cleanText(payload.rateDescription);
    const rateType = normalizeRateType(payload.rateType);
    const amount = euroToCents(payload.amount);
    const minimumAmount = euroToCents(payload.minimumAmount);
    const totalQuantityLimit = optionalPositiveInteger(
      payload.totalQuantityLimit
    );
    const quantityPerOrderLimit = optionalPositiveInteger(
      payload.quantityPerOrderLimit
    );

    if (!title) {
      return NextResponse.json(
        { error: "Le nom de la billetterie est obligatoire." },
        { status: 400 }
      );
    }

    if (!rateName) {
      return NextResponse.json(
        { error: "Le nom du premier tarif est obligatoire." },
        { status: 400 }
      );
    }

    if (rateType === "fixed" && amount <= 0) {
      return NextResponse.json(
        { error: "Le montant du tarif fixe doit être supérieur à 0 €." },
        { status: 400 }
      );
    }

    if (rateType === "free_amount" && minimumAmount <= 0) {
      return NextResponse.json(
        { error: "Le minimum du prix libre doit être supérieur à 0 €." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const eventId = crypto.randomUUID();
    const slug = await makeUniqueSlug(title);

    const event: TicketingEvent = {
      id: eventId,
      slug,
      title,
      formTypeLabel: formTypeLabel || "Billetterie",
      status: "draft",
      isVisible: false,

      locationName: locationName || undefined,
      addressLine: addressLine || undefined,
      postalCode: postalCode || undefined,
      city: city || undefined,
      country: country || undefined,

      durationType,
      startsAt: startsAt || undefined,
      endsAt: endsAt || undefined,

      organizerEmail: organizerEmail || undefined,
      organizerPhone: organizerPhone || undefined,

      shortDescription: shortDescription || undefined,
      longDescription: undefined,

      primaryColor: undefined,
      bannerImageUrl: undefined,
      thumbnailImageUrl: undefined,

      // Contribution SCA appliquée par défaut, mais non affichée à l’organisateur.
      allowExtraDonation: true,
      suggestedDonationAmounts: [],
      extraDonationSuggestedPercent: 5,

      ownerOrganizerId: organizer.id,

      totalParticipantLimit: undefined,
      salesOpenAt: undefined,
      salesCloseAt: undefined,

      confirmationEmailSubject: undefined,
      confirmationEmailMessage: undefined,
      confirmationEmailEnabled: true,

      createdAt: now,
      updatedAt: now,
    };

    const rate: TicketingRate = {
      id: crypto.randomUUID(),
      eventId,
      name: rateName,
      description: rateDescription || undefined,
      type: rateType,
      amount: rateType === "fixed" ? amount : undefined,
      minimumAmount: rateType === "free_amount" ? minimumAmount : undefined,
      isActive: true,
      totalQuantityLimit,
      quantityPerOrderLimit,

      promoCodeEnabled: false,
      promoCodePublic: false,
      promoCode: undefined,
      promoDiscountPercent: 0,

      createdAt: now,
      updatedAt: now,
    };

    await storage.saveTicketingEvent(event);
    await storage.replaceTicketingRates(event.id, [rate]);

    return NextResponse.json({
      ok: true,
      event,
      redirectTo: "/organisateur/billetteries",
    });
  } catch (error) {
    console.error("Erreur création billetterie organisateur", error);

    const message =
      error instanceof Error
        ? error.message
        : "Impossible de créer cette billetterie.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}