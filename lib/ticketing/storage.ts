import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  TicketingCollaboratorAccess,
  TicketingCustomField,
  TicketingEvent,
  TicketingOrder,
  TicketingOrganizerAccount,
  TicketingRate,
} from "@/lib/ticketing/types";

export type TicketingStoreData = {
  events: TicketingEvent[];
  rates: TicketingRate[];
  customFields: TicketingCustomField[];
  orders: TicketingOrder[];
  organizerAccounts: TicketingOrganizerAccount[];
  collaboratorAccesses: TicketingCollaboratorAccess[];
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "ticketing.json");

const EMPTY_TICKETING_STORE: TicketingStoreData = {
  events: [],
  rates: [],
  customFields: [],
  orders: [],
  organizerAccounts: [],
  collaboratorAccesses: [],
};

function slugifyFieldKey(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizePercent(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(100, Math.round(number)));
}

function normalizeContributionPercent(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) return 0;

  return Math.max(0, Math.min(10, Math.round(number)));
}

function normalizeStatus(value: unknown) {
  if (value === "active") return "active";
  if (value === "blocked") return "blocked";
  if (value === "deleted") return "deleted";
  return "pending_validation";
}

function normalizeEvent(event: any): TicketingEvent {
  return {
    id: String(event?.id || crypto.randomUUID()),
    slug: String(event?.slug || ""),
    title: String(event?.title || "Billetterie sans nom"),
    formTypeLabel:
      typeof event?.formTypeLabel === "string"
        ? event.formTypeLabel
        : undefined,
    status:
      event?.status === "published" ||
      event?.status === "hidden" ||
      event?.status === "archived"
        ? event.status
        : "draft",
    isVisible: Boolean(event?.isVisible),

    locationName:
      typeof event?.locationName === "string" ? event.locationName : undefined,
    addressLine:
      typeof event?.addressLine === "string" ? event.addressLine : undefined,
    postalCode:
      typeof event?.postalCode === "string" ? event.postalCode : undefined,
    city: typeof event?.city === "string" ? event.city : undefined,
    country: typeof event?.country === "string" ? event.country : undefined,

    durationType:
      event?.durationType === "one_day" ||
      event?.durationType === "several_days"
        ? event.durationType
        : "none",
    startsAt: typeof event?.startsAt === "string" ? event.startsAt : undefined,
    endsAt: typeof event?.endsAt === "string" ? event.endsAt : undefined,

    organizerEmail:
      typeof event?.organizerEmail === "string"
        ? event.organizerEmail
        : undefined,
    organizerPhone:
      typeof event?.organizerPhone === "string"
        ? event.organizerPhone
        : undefined,

    shortDescription:
      typeof event?.shortDescription === "string"
        ? event.shortDescription
        : undefined,
    longDescription:
      typeof event?.longDescription === "string"
        ? event.longDescription
        : undefined,

    primaryColor:
      typeof event?.primaryColor === "string" ? event.primaryColor : undefined,
    bannerImageUrl:
      typeof event?.bannerImageUrl === "string"
        ? event.bannerImageUrl
        : undefined,
    thumbnailImageUrl:
      typeof event?.thumbnailImageUrl === "string"
        ? event.thumbnailImageUrl
        : undefined,

    allowExtraDonation: Boolean(event?.allowExtraDonation),
    suggestedDonationAmounts: Array.isArray(event?.suggestedDonationAmounts)
      ? event.suggestedDonationAmounts
      : [],
    extraDonationSuggestedPercent: normalizeContributionPercent(
      event?.extraDonationSuggestedPercent
    ),

    ownerOrganizerId:
      typeof event?.ownerOrganizerId === "string" && event.ownerOrganizerId
        ? event.ownerOrganizerId
        : undefined,

    totalParticipantLimit:
      typeof event?.totalParticipantLimit === "number"
        ? event.totalParticipantLimit
        : event?.totalParticipantLimit ?? undefined,
    salesOpenAt:
      typeof event?.salesOpenAt === "string" ? event.salesOpenAt : undefined,
    salesCloseAt:
      typeof event?.salesCloseAt === "string" ? event.salesCloseAt : undefined,

    confirmationEmailSubject:
      typeof event?.confirmationEmailSubject === "string"
        ? event.confirmationEmailSubject
        : undefined,
    confirmationEmailMessage:
      typeof event?.confirmationEmailMessage === "string"
        ? event.confirmationEmailMessage
        : undefined,
    confirmationEmailEnabled: event?.confirmationEmailEnabled !== false,

    createdAt:
      typeof event?.createdAt === "string"
        ? event.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof event?.updatedAt === "string"
        ? event.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeRate(rate: any): TicketingRate {
  return {
    id: String(rate?.id || crypto.randomUUID()),
    eventId: String(rate?.eventId || ""),
    name: String(rate?.name || "Tarif sans nom"),
    description:
      typeof rate?.description === "string" ? rate.description : undefined,
    type:
      rate?.type === "free_amount" || rate?.type === "free"
        ? rate.type
        : "fixed",
    amount:
      typeof rate?.amount === "number" ? rate.amount : rate?.amount ?? undefined,
    minimumAmount:
      typeof rate?.minimumAmount === "number"
        ? rate.minimumAmount
        : rate?.minimumAmount ?? undefined,
    isActive:
      typeof rate?.isActive === "boolean" ? Boolean(rate.isActive) : true,
    totalQuantityLimit:
      typeof rate?.totalQuantityLimit === "number"
        ? rate.totalQuantityLimit
        : rate?.totalQuantityLimit ?? undefined,
    quantityPerOrderLimit:
      typeof rate?.quantityPerOrderLimit === "number"
        ? rate.quantityPerOrderLimit
        : rate?.quantityPerOrderLimit ?? undefined,

    promoCodeEnabled: Boolean(rate?.promoCodeEnabled),
    promoCodePublic: Boolean(rate?.promoCodePublic),
    promoCode:
      typeof rate?.promoCode === "string" && rate.promoCode.trim()
        ? rate.promoCode.trim()
        : undefined,
    promoDiscountPercent: normalizePercent(rate?.promoDiscountPercent),

    createdAt:
      typeof rate?.createdAt === "string"
        ? rate.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof rate?.updatedAt === "string"
        ? rate.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeCustomField(field: any): TicketingCustomField {
  const label = String(field?.label || "").trim() || "Champ sans nom";

  return {
    id: String(field?.id || crypto.randomUUID()),
    eventId: String(field?.eventId || ""),
    label,
    fieldKey:
      String(field?.fieldKey || "").trim() ||
      slugifyFieldKey(label) ||
      `champ_${crypto.randomUUID().slice(0, 8)}`,
    type:
      field?.type === "long_text" ||
      field?.type === "email" ||
      field?.type === "phone" ||
      field?.type === "number" ||
      field?.type === "date" ||
      field?.type === "select" ||
      field?.type === "checkbox"
        ? field.type
        : "short_text",

    target: "participant",

    isRequired: Boolean(field?.isRequired),
    isActive:
      typeof field?.isActive === "boolean" ? Boolean(field.isActive) : true,
    appliesToRateIds: Array.isArray(field?.appliesToRateIds)
      ? field.appliesToRateIds
      : undefined,
    options: Array.isArray(field?.options) ? field.options : [],
    position: Number.isFinite(Number(field?.position))
      ? Number(field.position)
      : 0,
    createdAt:
      typeof field?.createdAt === "string"
        ? field.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof field?.updatedAt === "string"
        ? field.updatedAt
        : new Date().toISOString(),
  };
}

function normalizeOrganizerAccount(account: any): TicketingOrganizerAccount {
  return {
    id: String(account?.id || crypto.randomUUID()),
    email: String(account?.email || "").trim().toLowerCase(),
    displayName:
      typeof account?.displayName === "string" && account.displayName.trim()
        ? account.displayName.trim()
        : undefined,
    passwordHash:
      typeof account?.passwordHash === "string" && account.passwordHash
        ? account.passwordHash
        : undefined,
    status: normalizeStatus(account?.status),
    canCreateEvents:
      typeof account?.canCreateEvents === "boolean"
        ? Boolean(account.canCreateEvents)
        : true,
    canReceiveNotifications:
      typeof account?.canReceiveNotifications === "boolean"
        ? Boolean(account.canReceiveNotifications)
        : true,
    validatedAt:
      typeof account?.validatedAt === "string" ? account.validatedAt : undefined,
    blockedAt:
      typeof account?.blockedAt === "string" ? account.blockedAt : undefined,
    deletedAt:
      typeof account?.deletedAt === "string" ? account.deletedAt : undefined,
    lastLoginAt:
      typeof account?.lastLoginAt === "string" ? account.lastLoginAt : undefined,
    createdAt:
      typeof account?.createdAt === "string"
        ? account.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof account?.updatedAt === "string"
        ? account.updatedAt
        : new Date().toISOString(),
  };
}

async function ensureTicketingFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify(EMPTY_TICKETING_STORE, null, 2),
      "utf8"
    );
  }
}

async function readTicketingStore(): Promise<TicketingStoreData> {
  await ensureTicketingFile();

  const content = await fs.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(content) as Partial<TicketingStoreData>;

  return {
    events: Array.isArray(parsed.events)
      ? parsed.events.map(normalizeEvent)
      : [],
    rates: Array.isArray(parsed.rates)
      ? parsed.rates.map(normalizeRate)
      : [],
    customFields: Array.isArray(parsed.customFields)
      ? parsed.customFields.map(normalizeCustomField)
      : [],
    orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    organizerAccounts: Array.isArray(parsed.organizerAccounts)
      ? parsed.organizerAccounts.map(normalizeOrganizerAccount)
      : [],
    collaboratorAccesses: Array.isArray(parsed.collaboratorAccesses)
      ? parsed.collaboratorAccesses
      : [],
  };
}

async function writeTicketingStore(data: TicketingStoreData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function getTicketingEvents() {
  const store = await readTicketingStore();
  return store.events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTicketingEventById(id: string) {
  const store = await readTicketingStore();
  return store.events.find((event) => event.id === id);
}

export async function getTicketingEventBySlug(slug: string) {
  const store = await readTicketingStore();
  return store.events.find((event) => event.slug === slug);
}

export async function saveTicketingEvent(event: TicketingEvent) {
  const store = await readTicketingStore();

  const normalizedEvent = normalizeEvent(event);

  const alreadyExists = store.events.some(
    (entry) => entry.id === normalizedEvent.id
  );

  if (alreadyExists) {
    throw new Error(
      `Une billetterie existe déjà avec l’identifiant ${normalizedEvent.id}.`
    );
  }

  store.events.push(normalizedEvent);
  await writeTicketingStore(store);

  return normalizedEvent;
}

export async function updateTicketingEvent(id: string, event: TicketingEvent) {
  const store = await readTicketingStore();

  const exists = store.events.some((entry) => entry.id === id);

  if (!exists) {
    throw new Error(`Billetterie introuvable pour l’identifiant ${id}.`);
  }

  const normalizedEvent = normalizeEvent(event);

  store.events = store.events.map((entry) =>
    entry.id === id ? normalizedEvent : entry
  );
  await writeTicketingStore(store);

  return normalizedEvent;
}

export async function deleteTicketingEvent(id: string) {
  const store = await readTicketingStore();

  store.events = store.events.filter((event) => event.id !== id);
  store.rates = store.rates.filter((rate) => rate.eventId !== id);
  store.customFields = store.customFields.filter((field) => field.eventId !== id);
  store.orders = store.orders.filter((order) => order.eventId !== id);
  store.collaboratorAccesses = store.collaboratorAccesses.filter(
    (access) => access.eventId !== id
  );

  await writeTicketingStore(store);
}

export async function getTicketingRates(eventId: string) {
  const store = await readTicketingStore();
  return store.rates.filter((rate) => rate.eventId === eventId);
}

export async function replaceTicketingRates(
  eventId: string,
  rates: TicketingRate[]
) {
  const store = await readTicketingStore();

  const normalizedRates = rates.map((rate) =>
    normalizeRate({
      ...rate,
      eventId,
    })
  );

  store.rates = [
    ...store.rates.filter((rate) => rate.eventId !== eventId),
    ...normalizedRates,
  ];

  await writeTicketingStore(store);

  return normalizedRates;
}

export async function getTicketingCustomFields(eventId: string) {
  const store = await readTicketingStore();

  return store.customFields
    .filter((field) => field.eventId === eventId)
    .sort((a, b) => a.position - b.position);
}

export async function replaceTicketingCustomFields(
  eventId: string,
  customFields: TicketingCustomField[]
) {
  const store = await readTicketingStore();

  const normalizedFields = customFields.map((field) =>
    normalizeCustomField({
      ...field,
      eventId,
    })
  );

  store.customFields = [
    ...store.customFields.filter((field) => field.eventId !== eventId),
    ...normalizedFields,
  ];

  await writeTicketingStore(store);

  return normalizedFields;
}

export async function getTicketingOrders(eventId?: string) {
  const store = await readTicketingStore();

  const orders = eventId
    ? store.orders.filter((order) => order.eventId === eventId)
    : store.orders;

  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTicketingOrderByReference(reference: string) {
  const store = await readTicketingStore();
  return store.orders.find((order) => order.reference === reference);
}

export async function saveTicketingOrder(order: TicketingOrder) {
  const store = await readTicketingStore();

  const alreadyExists = store.orders.some(
    (entry) => entry.reference === order.reference
  );

  if (alreadyExists) {
    throw new Error(
      `Une inscription existe déjà avec la référence ${order.reference}.`
    );
  }

  store.orders.push(order);
  await writeTicketingStore(store);

  return order;
}

export async function updateTicketingOrder(
  reference: string,
  order: TicketingOrder
) {
  const store = await readTicketingStore();

  const exists = store.orders.some((entry) => entry.reference === reference);

  if (!exists) {
    throw new Error(`Inscription introuvable pour la référence ${reference}.`);
  }

  store.orders = store.orders.map((entry) =>
    entry.reference === reference ? order : entry
  );

  await writeTicketingStore(store);

  return order;
}

export async function getTicketingOrganizerAccounts() {
  const store = await readTicketingStore();

  return store.organizerAccounts
    .filter((account) => account.status !== "deleted")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getTicketingOrganizerAccountById(id: string) {
  const store = await readTicketingStore();

  return store.organizerAccounts.find(
    (account) => account.id === id && account.status !== "deleted"
  );
}

export async function getTicketingOrganizerAccountByEmail(email: string) {
  const store = await readTicketingStore();
  const normalizedEmail = String(email || "").trim().toLowerCase();

  return store.organizerAccounts.find(
    (account) =>
      account.email.toLowerCase() === normalizedEmail &&
      account.status !== "deleted"
  );
}

export async function saveTicketingOrganizerAccount(
  account: TicketingOrganizerAccount
) {
  const store = await readTicketingStore();

  const normalizedAccount = normalizeOrganizerAccount(account);

  const alreadyExists = store.organizerAccounts.some(
    (entry) =>
      entry.id === normalizedAccount.id ||
      entry.email.toLowerCase() === normalizedAccount.email.toLowerCase()
  );

  if (alreadyExists) {
    throw new Error(
      `Un organisateur existe déjà avec cet identifiant ou cet email.`
    );
  }

  store.organizerAccounts.push(normalizedAccount);
  await writeTicketingStore(store);

  return normalizedAccount;
}

export async function updateTicketingOrganizerAccount(
  id: string,
  account: TicketingOrganizerAccount
) {
  const store = await readTicketingStore();

  const exists = store.organizerAccounts.some((entry) => entry.id === id);

  if (!exists) {
    throw new Error(`Compte organisateur introuvable pour l’identifiant ${id}.`);
  }

  const normalizedAccount = normalizeOrganizerAccount(account);

  const duplicateEmail = store.organizerAccounts.some(
    (entry) =>
      entry.id !== id &&
      entry.status !== "deleted" &&
      entry.email.toLowerCase() === normalizedAccount.email.toLowerCase()
  );

  if (duplicateEmail) {
    throw new Error(`Un autre organisateur utilise déjà cet email.`);
  }

  store.organizerAccounts = store.organizerAccounts.map((entry) =>
    entry.id === id ? normalizedAccount : entry
  );

  await writeTicketingStore(store);

  return normalizedAccount;
}

export async function getTicketingCollaboratorAccesses(eventId: string) {
  const store = await readTicketingStore();

  return store.collaboratorAccesses.filter(
    (access) => access.eventId === eventId && access.status !== "deleted"
  );
}

export async function saveTicketingCollaboratorAccess(
  access: TicketingCollaboratorAccess
) {
  const store = await readTicketingStore();

  const alreadyExists = store.collaboratorAccesses.some(
    (entry) => entry.id === access.id
  );

  if (alreadyExists) {
    throw new Error(`Un accès existe déjà avec l’identifiant ${access.id}.`);
  }

  store.collaboratorAccesses.push(access);
  await writeTicketingStore(store);

  return access;
}

export async function updateTicketingCollaboratorAccess(
  id: string,
  access: TicketingCollaboratorAccess
) {
  const store = await readTicketingStore();

  const exists = store.collaboratorAccesses.some((entry) => entry.id === id);

  if (!exists) {
    throw new Error(`Accès organisateur introuvable pour l’identifiant ${id}.`);
  }

  store.collaboratorAccesses = store.collaboratorAccesses.map((entry) =>
    entry.id === id ? access : entry
  );

  await writeTicketingStore(store);

  return access;
}