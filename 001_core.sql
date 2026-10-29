-- LogiRoute core schema. Run AFTER `npm run auth:migrate` (needs Better Auth's "user" table).
begin;

create sequence if not exists delivery_seq;
create sequence if not exists vehicle_seq;
create sequence if not exists driver_seq;

create table drivers (
  id bigint generated always as identity primary key,
  business_id text not null unique default 'DRV-' || lpad(nextval('driver_seq')::text, 6, '0'),
  full_name text not null,
  phone text not null check (phone ~ '^\+?[0-9 ]{10,14}$'),
  email text check (email is null or email ~ '^\S+@\S+\.\S+$'),
  address text not null,
  licence_no text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table delivery_partners (
  id bigint generated always as identity primary key,
  name text not null unique,
  contact_person text,
  phone text not null check (phone ~ '^\+?[0-9 ]{10,14}$'),
  email text check (email is null or email ~ '^\S+@\S+\.\S+$'),
  address text not null,
  created_at timestamptz not null default now()
);

create table recipients (
  id bigint generated always as identity primary key,
  full_name text not null,
  phone text not null check (phone ~ '^\+?[0-9 ]{10,14}$'),
  email text check (email is null or email ~ '^\S+@\S+\.\S+$'),
  address_line text not null,
  city text not null,
  state text not null,
  postal_code text not null,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  created_at timestamptz not null default now()
);

create table vehicles (
  id bigint generated always as identity primary key,
  business_id text not null unique default 'VEH-' || lpad(nextval('vehicle_seq')::text, 6, '0'),
  vehicle_type text not null,
  capacity_kg numeric(10,2) not null check (capacity_kg >= 0),
  volume_m3 numeric(8,2) not null check (volume_m3 >= 0),
  status text not null default 'Available' check (status in ('Available','Maintenance','Retired')),
  driver_id bigint references drivers(id),
  created_at timestamptz not null default now()
);

create table deliveries (
  id bigint generated always as identity primary key,
  business_id text not null unique
    default 'DEL-' || to_char(now() at time zone 'UTC','YYYY') || '-' || lpad(nextval('delivery_seq')::text, 6, '0'),
  category text not null,
  weight_kg numeric(10,2) not null check (weight_kg >= 0),
  value_inr numeric(12,2) check (value_inr is null or value_inr >= 0),
  status text not null default 'Pending'
    check (status in ('Pending','Planned','Assigned','In Transit','Delivered','Failed','Unserved','Exception')),
  recipient_id bigint not null references recipients(id),
  partner_id bigint references delivery_partners(id),
  vehicle_id bigint references vehicles(id),
  expected_at timestamptz,
  delivered_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);
create index on deliveries (status);
create index on deliveries (vehicle_id);
create index on deliveries (recipient_id);
create index on deliveries (partner_id);
create index on deliveries (created_at desc);

-- Append-only history of every status change.
create table delivery_events (
  id bigint generated always as identity primary key,
  delivery_id bigint not null references deliveries(id),
  event_type text not null,
  from_status text,
  to_status text,
  actor text not null,
  created_at timestamptz not null default now()
);
create index on delivery_events (delivery_id, created_at);

-- Real positions pushed by GPS devices / carrier webhooks.
create table vehicle_positions (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references vehicles(id),
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  speed_kmh numeric(6,2) check (speed_kmh is null or speed_kmh >= 0),
  recorded_at timestamptz not null,
  source text not null default 'device'
);
create index on vehicle_positions (vehicle_id, recorded_at desc);

create table audit_events (
  id bigint generated always as identity primary key,
  actor text not null,
  action text not null,
  entity text not null,
  before_value jsonb,
  after_value jsonb,
  created_at timestamptz not null default now()
);

create function audit_events_immutable() returns trigger language plpgsql as
$$ begin raise exception 'audit_events is append-only'; end $$;
create trigger audit_no_update before update or delete on audit_events
  for each row execute function audit_events_immutable();

-- The API connects with a server-side role. Block any direct client access via Supabase's public API.
alter table drivers enable row level security;
alter table delivery_partners enable row level security;
alter table recipients enable row level security;
alter table vehicles enable row level security;
alter table deliveries enable row level security;
alter table delivery_events enable row level security;
alter table vehicle_positions enable row level security;
alter table audit_events enable row level security;

commit;
