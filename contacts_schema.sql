-- Contacts schema (Supabase PostgreSQL). Run as a version-controlled migration.
create table drivers (
  id bigint generated always as identity primary key,
  business_id text not null unique,               -- e.g. DRV-000001
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

-- Each delivery points at its recipient, partner and (via its route) driver.
alter table deliveries
  add column recipient_id bigint references recipients(id),
  add column partner_id bigint references delivery_partners(id);
alter table vehicles
  add column driver_id bigint references drivers(id);

create index on deliveries (recipient_id);
create index on deliveries (partner_id);

-- Keep personal data server-side: enable RLS and expose only through the authenticated API.
alter table drivers enable row level security;
alter table delivery_partners enable row level security;
alter table recipients enable row level security;
