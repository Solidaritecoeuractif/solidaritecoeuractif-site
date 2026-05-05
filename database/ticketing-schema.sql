create table if not exists ticketing_events (
  id text primary key,
  slug text not null unique,

  title text not null,
  form_type_label text,

  status text not null default 'draft',
  is_visible boolean not null default false,

  location_name text,
  address_line text,
  postal_code text,
  city text,
  country text,

  duration_type text not null default 'none',
  starts_at timestamptz,
  ends_at timestamptz,

  organizer_email text,
  organizer_phone text,

  short_description text,
  long_description text,

  primary_color text,
  banner_image_url text,
  thumbnail_image_url text,

  allow_extra_donation boolean not null default false,
  suggested_donation_amounts integer[] not null default '{}',

  total_participant_limit integer,
  sales_open_at timestamptz,
  sales_close_at timestamptz,

  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists ticketing_rates (
  id text primary key,
  event_id text not null references ticketing_events(id) on delete cascade,

  name text not null,
  description text,

  type text not null,
  amount integer,
  minimum_amount integer,

  is_active boolean not null default true,

  total_quantity_limit integer,
  quantity_per_order_limit integer,

  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists ticketing_custom_fields (
  id text primary key,
  event_id text not null references ticketing_events(id) on delete cascade,

  label text not null,
  type text not null,

  is_required boolean not null default false,

  applies_to_rate_ids text[],
  options text[],

  position integer not null default 0,

  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists ticketing_orders (
  id text primary key,
  event_id text not null references ticketing_events(id) on delete cascade,
  reference text not null unique,

  payer_first_name text not null,
  payer_last_name text not null,
  payer_email text not null,
  payer_phone text,

  subtotal_amount integer not null default 0,
  extra_donation_amount integer not null default 0,
  total_amount integer not null default 0,

  currency text not null default 'eur',

  payment_status text not null default 'pending',

  stripe_session_id text,
  stripe_payment_intent_id text,

  confirmation_email_sent_at timestamptz,
  admin_notification_sent_at timestamptz,

  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists ticketing_participants (
  id text primary key,
  event_id text not null references ticketing_events(id) on delete cascade,
  order_id text not null references ticketing_orders(id) on delete cascade,
  rate_id text not null references ticketing_rates(id) on delete restrict,

  first_name text not null,
  last_name text not null,

  answers jsonb not null default '{}',

  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists ticketing_collaborator_accesses (
  id text primary key,
  event_id text not null references ticketing_events(id) on delete cascade,

  email text not null,
  display_name text,

  password_hash text,

  status text not null default 'pending_validation',

  can_edit_event boolean not null default true,
  can_edit_rates boolean not null default true,
  can_view_participants boolean not null default true,
  can_receive_notifications boolean not null default true,

  validated_at timestamptz,
  blocked_at timestamptz,
  deleted_at timestamptz,

  last_login_at timestamptz,

  created_at timestamptz not null,
  updated_at timestamptz not null,

  unique(event_id, email)
);

create index if not exists ticketing_events_status_idx
  on ticketing_events(status);

create index if not exists ticketing_events_is_visible_idx
  on ticketing_events(is_visible);

create index if not exists ticketing_rates_event_id_idx
  on ticketing_rates(event_id);

create index if not exists ticketing_custom_fields_event_id_idx
  on ticketing_custom_fields(event_id);

create index if not exists ticketing_orders_event_id_idx
  on ticketing_orders(event_id);

create index if not exists ticketing_orders_payment_status_idx
  on ticketing_orders(payment_status);

create index if not exists ticketing_participants_event_id_idx
  on ticketing_participants(event_id);

create index if not exists ticketing_participants_order_id_idx
  on ticketing_participants(order_id);

create index if not exists ticketing_collaborator_accesses_event_id_idx
  on ticketing_collaborator_accesses(event_id);

create index if not exists ticketing_collaborator_accesses_email_idx
  on ticketing_collaborator_accesses(email);