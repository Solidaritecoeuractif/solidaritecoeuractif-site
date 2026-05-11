import { Pool } from "pg";
import type {
  TicketingCollaboratorAccess,
  TicketingCustomField,
  TicketingCustomFieldTarget,
  TicketingCustomFieldType,
  TicketingEvent,
  TicketingOrder,
  TicketingOrganizerAccount,
  TicketingParticipant,
  TicketingRate,
} from "@/lib/ticketing/types";

function pool() {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error("DATABASE_URL manquant pour le stockage Postgres billetterie.");
  }

  return new Pool({ connectionString: url });
}

function toIso(value: unknown) {
  if (!value) return undefined;
  if (value instanceof Date) return value.toISOString();
  return new Date(String(value)).toISOString();
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

function normalizeFieldTarget(value: unknown): TicketingCustomFieldTarget {
  if (value === "payer") return "payer";
  return "participant";
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

function rowToTicketingEvent(row: any): TicketingEvent {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    formTypeLabel: row.form_type_label ?? undefined,
    status: row.status,
    isVisible: row.is_visible,
    locationName: row.location_name ?? undefined,
    addressLine: row.address_line ?? undefined,
    postalCode: row.postal_code ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    durationType: row.duration_type,
    startsAt: toIso(row.starts_at),
    endsAt: toIso(row.ends_at),
    organizerEmail: row.organizer_email ?? undefined,
    organizerPhone: row.organizer_phone ?? undefined,
    shortDescription: row.short_description ?? undefined,
    longDescription: row.long_description ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    bannerImageUrl: row.banner_image_url ?? undefined,
    thumbnailImageUrl: row.thumbnail_image_url ?? undefined,
    allowExtraDonation: row.allow_extra_donation,
    suggestedDonationAmounts: Array.isArray(row.suggested_donation_amounts)
      ? row.suggested_donation_amounts
      : [],
    extraDonationSuggestedPercent: normalizeContributionPercent(
      row.extra_donation_suggested_percent
    ),
    ownerOrganizerId: row.owner_organizer_id ?? undefined,
    totalParticipantLimit: row.total_participant_limit ?? undefined,
    salesOpenAt: toIso(row.sales_open_at),
    salesCloseAt: toIso(row.sales_close_at),
    confirmationEmailSubject: row.confirmation_email_subject ?? undefined,
    confirmationEmailMessage: row.confirmation_email_message ?? undefined,
    confirmationEmailEnabled: row.confirmation_email_enabled !== false,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

function rowToTicketingRate(row: any): TicketingRate {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    description: row.description ?? undefined,
    type: row.type,
    amount: row.amount ?? undefined,
    minimumAmount: row.minimum_amount ?? undefined,
    isActive: row.is_active,
    totalQuantityLimit: row.total_quantity_limit ?? undefined,
    quantityPerOrderLimit: row.quantity_per_order_limit ?? undefined,
    promoCodeEnabled: Boolean(row.promo_code_enabled),
    promoCodePublic: Boolean(row.promo_code_public),
    promoCode: row.promo_code ?? undefined,
    promoDiscountPercent: normalizePercent(row.promo_discount_percent),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

function rowToTicketingCustomField(row: any): TicketingCustomField {
  return {
    id: row.id,
    eventId: row.event_id,
    label: row.label,
    fieldKey: row.field_key,
    type: normalizeFieldType(row.field_type),
    target: normalizeFieldTarget(row.target),
    isRequired: Boolean(row.is_required),
    isActive: Boolean(row.is_active),
    appliesToRateIds: undefined,
    options: Array.isArray(row.options_json) ? row.options_json : [],
    position: row.position ?? 0,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

function rowToTicketingParticipant(row: any): TicketingParticipant {
  return {
    id: row.id,
    eventId: row.event_id,
    rateId: row.rate_id,
    firstName: row.first_name,
    lastName: row.last_name,
    answers: row.answers ?? {},
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

function rowToTicketingOrder(
  row: any,
  participants: TicketingParticipant[]
): TicketingOrder {
  return {
    id: row.id,
    eventId: row.event_id,
    reference: row.reference,
    payerFirstName: row.payer_first_name,
    payerLastName: row.payer_last_name,
    payerEmail: row.payer_email,
    payerPhone: row.payer_phone ?? undefined,
    participants,
    subtotalAmount: row.subtotal_amount,
    extraDonationAmount: row.extra_donation_amount,
    totalAmount: row.total_amount,
    currency: row.currency,
    paymentStatus: row.payment_status,
    stripeSessionId: row.stripe_session_id ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent_id ?? undefined,
    confirmationEmailSentAt: toIso(row.confirmation_email_sent_at),
    adminNotificationSentAt: toIso(row.admin_notification_sent_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

function rowToTicketingOrganizerAccount(row: any): TicketingOrganizerAccount {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    passwordHash: row.password_hash ?? undefined,
    status: row.status,
    canCreateEvents: Boolean(row.can_create_events),
    canReceiveNotifications: Boolean(row.can_receive_notifications),
    validatedAt: toIso(row.validated_at),
    blockedAt: toIso(row.blocked_at),
    deletedAt: toIso(row.deleted_at),
    lastLoginAt: toIso(row.last_login_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

function rowToTicketingCollaboratorAccess(
  row: any
): TicketingCollaboratorAccess {
  return {
    id: row.id,
    eventId: row.event_id,
    email: row.email,
    displayName: row.display_name ?? undefined,
    passwordHash: row.password_hash ?? undefined,
    status: row.status,
    canEditEvent: row.can_edit_event,
    canEditRates: row.can_edit_rates,
    canViewParticipants: row.can_view_participants,
    canReceiveNotifications: row.can_receive_notifications,
    validatedAt: toIso(row.validated_at),
    blockedAt: toIso(row.blocked_at),
    deletedAt: toIso(row.deleted_at),
    lastLoginAt: toIso(row.last_login_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

export async function getPostgresTicketingEvents() {
  const client = await pool().connect();

  try {
    const result = await client.query(
      "select * from ticketing_events order by created_at desc"
    );

    return result.rows.map(rowToTicketingEvent);
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingEventById(id: string) {
  const client = await pool().connect();

  try {
    const result = await client.query(
      "select * from ticketing_events where id = $1 limit 1",
      [id]
    );

    return result.rows[0] ? rowToTicketingEvent(result.rows[0]) : undefined;
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingEventBySlug(slug: string) {
  const client = await pool().connect();

  try {
    const result = await client.query(
      "select * from ticketing_events where slug = $1 limit 1",
      [slug]
    );

    return result.rows[0] ? rowToTicketingEvent(result.rows[0]) : undefined;
  } finally {
    client.release();
  }
}

export async function savePostgresTicketingEvent(event: TicketingEvent) {
  const client = await pool().connect();

  try {
    await client.query(
      `insert into ticketing_events (
        id, slug, title, form_type_label, status, is_visible,
        location_name, address_line, postal_code, city, country,
        duration_type, starts_at, ends_at, organizer_email, organizer_phone,
        short_description, long_description, primary_color, banner_image_url,
        thumbnail_image_url, allow_extra_donation, suggested_donation_amounts,
        extra_donation_suggested_percent, owner_organizer_id,
        total_participant_limit, sales_open_at, sales_close_at,
        confirmation_email_subject, confirmation_email_message, confirmation_email_enabled,
        created_at, updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33
      )`,
      [
        event.id,
        event.slug,
        event.title,
        event.formTypeLabel ?? null,
        event.status,
        event.isVisible,
        event.locationName ?? null,
        event.addressLine ?? null,
        event.postalCode ?? null,
        event.city ?? null,
        event.country ?? null,
        event.durationType,
        event.startsAt ?? null,
        event.endsAt ?? null,
        event.organizerEmail ?? null,
        event.organizerPhone ?? null,
        event.shortDescription ?? null,
        event.longDescription ?? null,
        event.primaryColor ?? null,
        event.bannerImageUrl ?? null,
        event.thumbnailImageUrl ?? null,
        event.allowExtraDonation,
        event.suggestedDonationAmounts,
        normalizeContributionPercent(event.extraDonationSuggestedPercent),
        event.ownerOrganizerId ?? null,
        event.totalParticipantLimit ?? null,
        event.salesOpenAt ?? null,
        event.salesCloseAt ?? null,
        event.confirmationEmailSubject ?? null,
        event.confirmationEmailMessage ?? null,
        event.confirmationEmailEnabled !== false,
        event.createdAt,
        event.updatedAt,
      ]
    );

    return event;
  } finally {
    client.release();
  }
}

export async function updatePostgresTicketingEvent(
  id: string,
  event: TicketingEvent
) {
  const client = await pool().connect();

  try {
    await client.query(
      `update ticketing_events
       set slug = $2,
           title = $3,
           form_type_label = $4,
           status = $5,
           is_visible = $6,
           location_name = $7,
           address_line = $8,
           postal_code = $9,
           city = $10,
           country = $11,
           duration_type = $12,
           starts_at = $13,
           ends_at = $14,
           organizer_email = $15,
           organizer_phone = $16,
           short_description = $17,
           long_description = $18,
           primary_color = $19,
           banner_image_url = $20,
           thumbnail_image_url = $21,
           allow_extra_donation = $22,
           suggested_donation_amounts = $23,
           extra_donation_suggested_percent = $24,
           owner_organizer_id = $25,
           total_participant_limit = $26,
           sales_open_at = $27,
           sales_close_at = $28,
           confirmation_email_subject = $29,
           confirmation_email_message = $30,
           confirmation_email_enabled = $31,
           updated_at = $32
       where id = $1`,
      [
        id,
        event.slug,
        event.title,
        event.formTypeLabel ?? null,
        event.status,
        event.isVisible,
        event.locationName ?? null,
        event.addressLine ?? null,
        event.postalCode ?? null,
        event.city ?? null,
        event.country ?? null,
        event.durationType,
        event.startsAt ?? null,
        event.endsAt ?? null,
        event.organizerEmail ?? null,
        event.organizerPhone ?? null,
        event.shortDescription ?? null,
        event.longDescription ?? null,
        event.primaryColor ?? null,
        event.bannerImageUrl ?? null,
        event.thumbnailImageUrl ?? null,
        event.allowExtraDonation,
        event.suggestedDonationAmounts,
        normalizeContributionPercent(event.extraDonationSuggestedPercent),
        event.ownerOrganizerId ?? null,
        event.totalParticipantLimit ?? null,
        event.salesOpenAt ?? null,
        event.salesCloseAt ?? null,
        event.confirmationEmailSubject ?? null,
        event.confirmationEmailMessage ?? null,
        event.confirmationEmailEnabled !== false,
        event.updatedAt,
      ]
    );

    return event;
  } finally {
    client.release();
  }
}

export async function deletePostgresTicketingEvent(id: string) {
  const client = await pool().connect();

  try {
    await client.query("delete from ticketing_events where id = $1", [id]);
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingRates(eventId: string) {
  const client = await pool().connect();

  try {
    const result = await client.query(
      "select * from ticketing_rates where event_id = $1 order by created_at asc",
      [eventId]
    );

    return result.rows.map(rowToTicketingRate);
  } finally {
    client.release();
  }
}

export async function replacePostgresTicketingRates(
  eventId: string,
  rates: TicketingRate[]
) {
  const client = await pool().connect();

  try {
    await client.query("begin");

    const keptRateIds = rates.map((rate) => rate.id);

    for (const rate of rates) {
      await client.query(
        `insert into ticketing_rates (
          id,
          event_id,
          name,
          description,
          type,
          amount,
          minimum_amount,
          is_active,
          total_quantity_limit,
          quantity_per_order_limit,
          promo_code_enabled,
          promo_code_public,
          promo_code,
          promo_discount_percent,
          created_at,
          updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
        )
        on conflict (id) do update
        set event_id = excluded.event_id,
            name = excluded.name,
            description = excluded.description,
            type = excluded.type,
            amount = excluded.amount,
            minimum_amount = excluded.minimum_amount,
            is_active = excluded.is_active,
            total_quantity_limit = excluded.total_quantity_limit,
            quantity_per_order_limit = excluded.quantity_per_order_limit,
            promo_code_enabled = excluded.promo_code_enabled,
            promo_code_public = excluded.promo_code_public,
            promo_code = excluded.promo_code,
            promo_discount_percent = excluded.promo_discount_percent,
            updated_at = excluded.updated_at`,
        [
          rate.id,
          eventId,
          rate.name,
          rate.description ?? null,
          rate.type,
          rate.amount ?? null,
          rate.minimumAmount ?? null,
          rate.isActive,
          rate.totalQuantityLimit ?? null,
          rate.quantityPerOrderLimit ?? null,
          Boolean(rate.promoCodeEnabled),
          Boolean(rate.promoCodePublic),
          rate.promoCode?.trim() || null,
          normalizePercent(rate.promoDiscountPercent),
          rate.createdAt,
          rate.updatedAt,
        ]
      );
    }

    if (keptRateIds.length > 0) {
      await client.query(
        `update ticketing_rates
         set is_active = false,
             updated_at = $2
         where event_id = $1
         and not (id = any($3::text[]))`,
        [eventId, new Date().toISOString(), keptRateIds]
      );
    } else {
      await client.query(
        `update ticketing_rates
         set is_active = false,
             updated_at = $2
         where event_id = $1`,
        [eventId, new Date().toISOString()]
      );
    }

    await client.query("commit");
    return rates;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingCustomFields(eventId: string) {
  const client = await pool().connect();

  try {
    const result = await client.query(
      `select * from ticketing_form_fields
       where event_id = $1
       order by position asc, created_at asc`,
      [eventId]
    );

    return result.rows.map(rowToTicketingCustomField);
  } finally {
    client.release();
  }
}

export async function replacePostgresTicketingCustomFields(
  eventId: string,
  fields: TicketingCustomField[]
) {
  const client = await pool().connect();

  try {
    await client.query("begin");

    await client.query("delete from ticketing_form_fields where event_id = $1", [
      eventId,
    ]);

    for (const field of fields) {
      await client.query(
        `insert into ticketing_form_fields (
          id,
          event_id,
          label,
          field_key,
          field_type,
          target,
          is_required,
          is_active,
          options_json,
          position,
          created_at,
          updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
        )`,
        [
          field.id,
          eventId,
          field.label,
          field.fieldKey,
          field.type,
          "participant",
          field.isRequired,
          field.isActive,
          JSON.stringify(field.options ?? []),
          field.position,
          field.createdAt,
          field.updatedAt,
        ]
      );
    }

    await client.query("commit");
    return fields;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingOrders(eventId?: string) {
  const client = await pool().connect();

  try {
    const ordersResult = eventId
      ? await client.query(
          "select * from ticketing_orders where event_id = $1 order by created_at desc",
          [eventId]
        )
      : await client.query(
          "select * from ticketing_orders order by created_at desc"
        );

    const participantsResult = await client.query(
      "select * from ticketing_participants order by created_at asc"
    );

    return ordersResult.rows.map((row) =>
      rowToTicketingOrder(
        row,
        participantsResult.rows
          .filter((participant) => participant.order_id === row.id)
          .map(rowToTicketingParticipant)
      )
    );
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingOrderByReference(reference: string) {
  const client = await pool().connect();

  try {
    const orderResult = await client.query(
      "select * from ticketing_orders where reference = $1 limit 1",
      [reference]
    );

    if (!orderResult.rows[0]) return undefined;

    const participantsResult = await client.query(
      "select * from ticketing_participants where order_id = $1 order by created_at asc",
      [orderResult.rows[0].id]
    );

    return rowToTicketingOrder(
      orderResult.rows[0],
      participantsResult.rows.map(rowToTicketingParticipant)
    );
  } finally {
    client.release();
  }
}

export async function savePostgresTicketingOrder(order: TicketingOrder) {
  const client = await pool().connect();

  try {
    await client.query("begin");

    await client.query(
      `insert into ticketing_orders (
        id,
        event_id,
        reference,
        payer_first_name,
        payer_last_name,
        payer_email,
        payer_phone,
        subtotal_amount,
        extra_donation_amount,
        total_amount,
        currency,
        payment_status,
        stripe_session_id,
        stripe_payment_intent_id,
        confirmation_email_sent_at,
        admin_notification_sent_at,
        created_at,
        updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
      )`,
      [
        order.id,
        order.eventId,
        order.reference,
        order.payerFirstName,
        order.payerLastName,
        order.payerEmail,
        order.payerPhone ?? null,
        order.subtotalAmount,
        order.extraDonationAmount,
        order.totalAmount,
        order.currency,
        order.paymentStatus,
        order.stripeSessionId ?? null,
        order.stripePaymentIntentId ?? null,
        order.confirmationEmailSentAt ?? null,
        order.adminNotificationSentAt ?? null,
        order.createdAt,
        order.updatedAt,
      ]
    );

    for (const participant of order.participants) {
      await client.query(
        `insert into ticketing_participants (
          id,
          event_id,
          order_id,
          rate_id,
          first_name,
          last_name,
          answers,
          created_at,
          updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9
        )`,
        [
          participant.id,
          order.eventId,
          order.id,
          participant.rateId,
          participant.firstName,
          participant.lastName,
          participant.answers,
          participant.createdAt,
          participant.updatedAt,
        ]
      );
    }

    await client.query("commit");
    return order;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePostgresTicketingOrder(
  reference: string,
  order: TicketingOrder
) {
  const client = await pool().connect();

  try {
    await client.query("begin");

    const existingOrderResult = await client.query(
      "select id from ticketing_orders where reference = $1 limit 1",
      [reference]
    );

    const existingOrderId = existingOrderResult.rows[0]?.id;

    if (!existingOrderId) {
      throw new Error(`Inscription billetterie introuvable : ${reference}`);
    }

    await client.query(
      `update ticketing_orders
       set payer_first_name = $2,
           payer_last_name = $3,
           payer_email = $4,
           payer_phone = $5,
           subtotal_amount = $6,
           extra_donation_amount = $7,
           total_amount = $8,
           currency = $9,
           payment_status = $10,
           stripe_session_id = $11,
           stripe_payment_intent_id = $12,
           confirmation_email_sent_at = $13,
           admin_notification_sent_at = $14,
           updated_at = $15
       where reference = $1`,
      [
        reference,
        order.payerFirstName,
        order.payerLastName,
        order.payerEmail,
        order.payerPhone ?? null,
        order.subtotalAmount,
        order.extraDonationAmount,
        order.totalAmount,
        order.currency,
        order.paymentStatus,
        order.stripeSessionId ?? null,
        order.stripePaymentIntentId ?? null,
        order.confirmationEmailSentAt ?? null,
        order.adminNotificationSentAt ?? null,
        order.updatedAt,
      ]
    );

    await client.query("delete from ticketing_participants where order_id = $1", [
      existingOrderId,
    ]);

    for (const participant of order.participants) {
      await client.query(
        `insert into ticketing_participants (
          id,
          event_id,
          order_id,
          rate_id,
          first_name,
          last_name,
          answers,
          created_at,
          updated_at
        ) values (
          $1,$2,$3,$4,$5,$6,$7,$8,$9
        )`,
        [
          participant.id,
          order.eventId,
          existingOrderId,
          participant.rateId,
          participant.firstName,
          participant.lastName,
          participant.answers,
          participant.createdAt,
          participant.updatedAt,
        ]
      );
    }

    await client.query("commit");
    return order;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingOrganizerAccounts() {
  const client = await pool().connect();

  try {
    const result = await client.query(
      `select * from ticketing_organizer_accounts
       where status <> 'deleted'
       order by created_at desc`
    );

    return result.rows.map(rowToTicketingOrganizerAccount);
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingOrganizerAccountById(id: string) {
  const client = await pool().connect();

  try {
    const result = await client.query(
      `select * from ticketing_organizer_accounts
       where id = $1
       and status <> 'deleted'
       limit 1`,
      [id]
    );

    return result.rows[0]
      ? rowToTicketingOrganizerAccount(result.rows[0])
      : undefined;
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingOrganizerAccountByEmail(
  email: string
) {
  const client = await pool().connect();

  try {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const result = await client.query(
      `select * from ticketing_organizer_accounts
       where lower(email) = lower($1)
       and status <> 'deleted'
       limit 1`,
      [normalizedEmail]
    );

    return result.rows[0]
      ? rowToTicketingOrganizerAccount(result.rows[0])
      : undefined;
  } finally {
    client.release();
  }
}

export async function savePostgresTicketingOrganizerAccount(
  account: TicketingOrganizerAccount
) {
  const client = await pool().connect();

  try {
    await client.query(
      `insert into ticketing_organizer_accounts (
        id,
        email,
        display_name,
        password_hash,
        status,
        can_create_events,
        can_receive_notifications,
        validated_at,
        blocked_at,
        deleted_at,
        last_login_at,
        created_at,
        updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13
      )`,
      [
        account.id,
        account.email,
        account.displayName ?? null,
        account.passwordHash ?? null,
        account.status,
        account.canCreateEvents,
        account.canReceiveNotifications,
        account.validatedAt ?? null,
        account.blockedAt ?? null,
        account.deletedAt ?? null,
        account.lastLoginAt ?? null,
        account.createdAt,
        account.updatedAt,
      ]
    );

    return account;
  } finally {
    client.release();
  }
}

export async function updatePostgresTicketingOrganizerAccount(
  id: string,
  account: TicketingOrganizerAccount
) {
  const client = await pool().connect();

  try {
    await client.query(
      `update ticketing_organizer_accounts
       set email = $2,
           display_name = $3,
           password_hash = $4,
           status = $5,
           can_create_events = $6,
           can_receive_notifications = $7,
           validated_at = $8,
           blocked_at = $9,
           deleted_at = $10,
           last_login_at = $11,
           updated_at = $12
       where id = $1`,
      [
        id,
        account.email,
        account.displayName ?? null,
        account.passwordHash ?? null,
        account.status,
        account.canCreateEvents,
        account.canReceiveNotifications,
        account.validatedAt ?? null,
        account.blockedAt ?? null,
        account.deletedAt ?? null,
        account.lastLoginAt ?? null,
        account.updatedAt,
      ]
    );

    return account;
  } finally {
    client.release();
  }
}

export async function getPostgresTicketingCollaboratorAccesses(eventId: string) {
  const client = await pool().connect();

  try {
    const result = await client.query(
      `select * from ticketing_collaborator_accesses
       where event_id = $1
       and status <> 'deleted'
       order by created_at desc`,
      [eventId]
    );

    return result.rows.map(rowToTicketingCollaboratorAccess);
  } finally {
    client.release();
  }
}

export async function savePostgresTicketingCollaboratorAccess(
  access: TicketingCollaboratorAccess
) {
  const client = await pool().connect();

  try {
    await client.query(
      `insert into ticketing_collaborator_accesses (
        id,
        event_id,
        email,
        display_name,
        password_hash,
        status,
        can_edit_event,
        can_edit_rates,
        can_view_participants,
        can_receive_notifications,
        validated_at,
        blocked_at,
        deleted_at,
        last_login_at,
        created_at,
        updated_at
      ) values (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
      )`,
      [
        access.id,
        access.eventId,
        access.email,
        access.displayName ?? null,
        access.passwordHash ?? null,
        access.status,
        access.canEditEvent,
        access.canEditRates,
        access.canViewParticipants,
        access.canReceiveNotifications,
        access.validatedAt ?? null,
        access.blockedAt ?? null,
        access.deletedAt ?? null,
        access.lastLoginAt ?? null,
        access.createdAt,
        access.updatedAt,
      ]
    );

    return access;
  } finally {
    client.release();
  }
}

export async function updatePostgresTicketingCollaboratorAccess(
  id: string,
  access: TicketingCollaboratorAccess
) {
  const client = await pool().connect();

  try {
    await client.query(
      `update ticketing_collaborator_accesses
       set email = $2,
           display_name = $3,
           password_hash = $4,
           status = $5,
           can_edit_event = $6,
           can_edit_rates = $7,
           can_view_participants = $8,
           can_receive_notifications = $9,
           validated_at = $10,
           blocked_at = $11,
           deleted_at = $12,
           last_login_at = $13,
           updated_at = $14
       where id = $1`,
      [
        id,
        access.email,
        access.displayName ?? null,
        access.passwordHash ?? null,
        access.status,
        access.canEditEvent,
        access.canEditRates,
        access.canViewParticipants,
        access.canReceiveNotifications,
        access.validatedAt ?? null,
        access.blockedAt ?? null,
        access.deletedAt ?? null,
        access.lastLoginAt ?? null,
        access.updatedAt,
      ]
    );

    return access;
  } finally {
    client.release();
  }
}