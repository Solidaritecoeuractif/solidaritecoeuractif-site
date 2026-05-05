import type {
  TicketingCollaboratorAccess,
  TicketingCustomField,
  TicketingEvent,
  TicketingOrder,
  TicketingRate,
} from "@/lib/ticketing/types";

type TicketingStorage = {
  getTicketingEvents(): Promise<TicketingEvent[]>;
  getTicketingEventById(id: string): Promise<TicketingEvent | undefined>;
  getTicketingEventBySlug(slug: string): Promise<TicketingEvent | undefined>;
  saveTicketingEvent(event: TicketingEvent): Promise<TicketingEvent>;
  updateTicketingEvent(id: string, event: TicketingEvent): Promise<TicketingEvent>;
  deleteTicketingEvent(id: string): Promise<void>;

  getTicketingRates(eventId: string): Promise<TicketingRate[]>;
  replaceTicketingRates(
    eventId: string,
    rates: TicketingRate[]
  ): Promise<TicketingRate[]>;

  getTicketingCustomFields(eventId: string): Promise<TicketingCustomField[]>;
  replaceTicketingCustomFields(
    eventId: string,
    customFields: TicketingCustomField[]
  ): Promise<TicketingCustomField[]>;

  getTicketingOrders(eventId?: string): Promise<TicketingOrder[]>;
  getTicketingOrderByReference(
    reference: string
  ): Promise<TicketingOrder | undefined>;
  saveTicketingOrder(order: TicketingOrder): Promise<TicketingOrder>;
  updateTicketingOrder(
    reference: string,
    order: TicketingOrder
  ): Promise<TicketingOrder>;

  getTicketingCollaboratorAccesses(
    eventId: string
  ): Promise<TicketingCollaboratorAccess[]>;
  saveTicketingCollaboratorAccess(
    access: TicketingCollaboratorAccess
  ): Promise<TicketingCollaboratorAccess>;
  updateTicketingCollaboratorAccess(
    id: string,
    access: TicketingCollaboratorAccess
  ): Promise<TicketingCollaboratorAccess>;
};

let cachedStorage: TicketingStorage | null = null;

function shouldUsePostgres() {
  const driver = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  const isProduction =
    process.env.NODE_ENV === "production" || Boolean(process.env.VERCEL);

  return driver === "postgres" || isProduction;
}

export function ticketingStorage(): TicketingStorage {
  if (cachedStorage) {
    return cachedStorage;
  }

  if (shouldUsePostgres()) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const postgres = require("@/lib/ticketing/postgres");

    cachedStorage = {
      getTicketingEvents: postgres.getPostgresTicketingEvents,
      getTicketingEventById: postgres.getPostgresTicketingEventById,
      getTicketingEventBySlug: postgres.getPostgresTicketingEventBySlug,
      saveTicketingEvent: postgres.savePostgresTicketingEvent,
      updateTicketingEvent: postgres.updatePostgresTicketingEvent,
      deleteTicketingEvent: postgres.deletePostgresTicketingEvent,

      getTicketingRates: postgres.getPostgresTicketingRates,
      replaceTicketingRates: postgres.replacePostgresTicketingRates,

      getTicketingCustomFields: postgres.getPostgresTicketingCustomFields,
      replaceTicketingCustomFields:
        postgres.replacePostgresTicketingCustomFields,

      getTicketingOrders: postgres.getPostgresTicketingOrders,
      getTicketingOrderByReference: postgres.getPostgresTicketingOrderByReference,
      saveTicketingOrder: postgres.savePostgresTicketingOrder,
      updateTicketingOrder: postgres.updatePostgresTicketingOrder,

      getTicketingCollaboratorAccesses:
        postgres.getPostgresTicketingCollaboratorAccesses,
      saveTicketingCollaboratorAccess:
        postgres.savePostgresTicketingCollaboratorAccess,
      updateTicketingCollaboratorAccess:
        postgres.updatePostgresTicketingCollaboratorAccess,
    };

    return cachedStorage;
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const local = require("@/lib/ticketing/storage");

  cachedStorage = {
    getTicketingEvents: local.getTicketingEvents,
    getTicketingEventById: local.getTicketingEventById,
    getTicketingEventBySlug: local.getTicketingEventBySlug,
    saveTicketingEvent: local.saveTicketingEvent,
    updateTicketingEvent: local.updateTicketingEvent,
    deleteTicketingEvent: local.deleteTicketingEvent,

    getTicketingRates: local.getTicketingRates,
    replaceTicketingRates: local.replaceTicketingRates,

    getTicketingCustomFields: local.getTicketingCustomFields,
    replaceTicketingCustomFields: local.replaceTicketingCustomFields,

    getTicketingOrders: local.getTicketingOrders,
    getTicketingOrderByReference: local.getTicketingOrderByReference,
    saveTicketingOrder: local.saveTicketingOrder,
    updateTicketingOrder: local.updateTicketingOrder,

    getTicketingCollaboratorAccesses: local.getTicketingCollaboratorAccesses,
    saveTicketingCollaboratorAccess: local.saveTicketingCollaboratorAccess,
    updateTicketingCollaboratorAccess: local.updateTicketingCollaboratorAccess,
  };

  return cachedStorage;
}