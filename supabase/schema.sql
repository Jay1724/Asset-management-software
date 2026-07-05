-- Mining Asset Management Platform — Supabase schema
--
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query)
-- on a fresh project. It creates the full schema, Row-Level Security
-- policies, and the RPC functions the frontend (index.html) calls for
-- depreciation and valuation events.
--
-- Design notes:
-- - Tenancy and RBAC mirror apps/api's NestJS implementation, just moved
--   into Postgres: a `profiles` table (one row per auth.users row) carries
--   tenant_id + role, and RLS policies key off it via the auth_tenant_id()
--   / auth_role() helper functions below.
-- - Simple single-table CRUD (sites, asset_categories, assets) is governed
--   directly by RLS policies.
-- - The three operations that read-then-write across multiple tables —
--   recalculating depreciation, logging a manual valuation event, and
--   updating usage — are SECURITY DEFINER functions so the multi-step
--   read/compute/write happens atomically and the authorization check
--   lives in one place, instead of being split across several RLS
--   policies with edge cases (e.g. the depreciation engine needs to
--   insert a DEPRECIATION-type valuation_event, which regular users are
--   otherwise forbidden from creating directly).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.role as enum ('ADMIN', 'SITE_MANAGER', 'TECHNICIAN', 'AUDITOR');
create type public.depreciation_method as enum ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION');
create type public.unit_of_measure as enum ('CALENDAR', 'HOURS', 'TONNAGE');
create type public.asset_status as enum ('ACTIVE', 'IN_MAINTENANCE', 'DECOMMISSIONED', 'DISPOSED');
create type public.valuation_event_type as enum ('DEPRECIATION', 'APPRECIATION', 'MANUAL_ADJUSTMENT', 'MARKET_FEED');
create type public.valuation_source as enum ('SYSTEM_CALCULATED', 'MANUAL_ENTRY', 'MARKET_FEED');

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  logo_url text,
  primary_color text not null default '#0f172a',
  secondary_color text not null default '#2563eb',
  font_family text not null default 'Inter, sans-serif',
  regulatory_region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per auth.users row (see handle_new_user() trigger below).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid references public.tenants (id) on delete cascade,
  full_name text not null default '',
  role public.role not null default 'TECHNICIAN',
  created_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  location text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.asset_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  name text not null,
  default_depreciation_method public.depreciation_method not null default 'STRAIGHT_LINE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, name)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  site_id uuid not null references public.sites (id),
  category_id uuid not null references public.asset_categories (id),
  name text not null,
  serial_no text not null,
  purchase_date date not null,
  purchase_value numeric(18, 2) not null,
  current_value numeric(18, 2) not null,
  depreciation_method public.depreciation_method not null,
  unit_of_measure public.unit_of_measure not null default 'CALENDAR',
  status public.asset_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, serial_no)
);

create table public.depreciation_schedules (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null unique references public.assets (id) on delete cascade,
  method public.depreciation_method not null,
  rate numeric(9, 6),
  useful_life_years int,
  salvage_value numeric(18, 2) not null default 0,
  total_expected_units numeric(18, 2),
  units_used_to_date numeric(18, 2) not null default 0,
  last_calculated_value numeric(18, 2),
  last_run_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Immutable ledger: application code (and RLS below) must only ever
-- INSERT here, never UPDATE or DELETE.
create table public.valuation_events (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  type public.valuation_event_type not null,
  source public.valuation_source not null,
  amount numeric(18, 2) not null,
  resulting_value numeric(18, 2) not null,
  note text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now()
);

create index on public.profiles (tenant_id);
create index on public.sites (tenant_id);
create index on public.asset_categories (tenant_id);
create index on public.assets (tenant_id);
create index on public.assets (tenant_id, site_id);
create index on public.valuation_events (asset_id);

-- ---------------------------------------------------------------------
-- Auth helpers
-- ---------------------------------------------------------------------
-- SECURITY DEFINER so these can read `profiles` from inside a policy on
-- `profiles` itself without recursing into that same policy.
create or replace function public.auth_tenant_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_role()
returns public.role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Auto-create a profile row when a new auth user signs up / is created
-- via the admin API. tenant_id / full_name / role are read from
-- `user_metadata` passed at creation time (see supabase/seed.mjs).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, tenant_id, full_name, role)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'tenant_id', '')::uuid,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.role, 'TECHNICIAN')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------
alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.asset_categories enable row level security;
alter table public.assets enable row level security;
alter table public.depreciation_schedules enable row level security;
alter table public.valuation_events enable row level security;

-- Tenant branding is intentionally public (needed to theme the login
-- screen before anyone has authenticated), matching the /tenant/theme
-- endpoint in the NestJS version of this app. Writes are not exposed to
-- any client role at all (no insert/update/delete policy => denied).
create policy "tenants are publicly readable" on public.tenants
  for select using (true);

create policy "users can read their own profile" on public.profiles
  for select using (id = auth.uid());

create policy "tenant isolation: sites select" on public.sites
  for select using (tenant_id = public.auth_tenant_id());
create policy "tenant isolation: sites insert" on public.sites
  for insert with check (tenant_id = public.auth_tenant_id() and public.auth_role() = 'ADMIN');
create policy "tenant isolation: sites update" on public.sites
  for update using (tenant_id = public.auth_tenant_id() and public.auth_role() in ('ADMIN', 'SITE_MANAGER'))
  with check (tenant_id = public.auth_tenant_id());
create policy "tenant isolation: sites delete" on public.sites
  for delete using (tenant_id = public.auth_tenant_id() and public.auth_role() = 'ADMIN');

create policy "tenant isolation: categories select" on public.asset_categories
  for select using (tenant_id = public.auth_tenant_id());
create policy "tenant isolation: categories insert" on public.asset_categories
  for insert with check (tenant_id = public.auth_tenant_id() and public.auth_role() = 'ADMIN');
create policy "tenant isolation: categories update" on public.asset_categories
  for update using (tenant_id = public.auth_tenant_id() and public.auth_role() = 'ADMIN')
  with check (tenant_id = public.auth_tenant_id());
create policy "tenant isolation: categories delete" on public.asset_categories
  for delete using (tenant_id = public.auth_tenant_id() and public.auth_role() = 'ADMIN');

create policy "tenant isolation: assets select" on public.assets
  for select using (tenant_id = public.auth_tenant_id());
create policy "tenant isolation: assets insert" on public.assets
  for insert with check (tenant_id = public.auth_tenant_id() and public.auth_role() in ('ADMIN', 'SITE_MANAGER'));
create policy "tenant isolation: assets update" on public.assets
  for update using (tenant_id = public.auth_tenant_id() and public.auth_role() in ('ADMIN', 'SITE_MANAGER'))
  with check (tenant_id = public.auth_tenant_id());
create policy "tenant isolation: assets delete" on public.assets
  for delete using (tenant_id = public.auth_tenant_id() and public.auth_role() = 'ADMIN');

-- depreciation_schedules and valuation_events have no tenant_id column of
-- their own — scope via the parent asset, same approach as the Postgres
-- RLS migration in apps/api.
create policy "tenant isolation: schedules select" on public.depreciation_schedules
  for select using (exists (
    select 1 from public.assets a
    where a.id = depreciation_schedules.asset_id and a.tenant_id = public.auth_tenant_id()
  ));
-- No insert/update/delete policy on depreciation_schedules: every mutation
-- goes through the RPC functions below, which run as SECURITY DEFINER.

create policy "tenant isolation: events select" on public.valuation_events
  for select using (exists (
    select 1 from public.assets a
    where a.id = valuation_events.asset_id and a.tenant_id = public.auth_tenant_id()
  ));
-- No insert/update/delete policy on valuation_events either — the ledger
-- is only ever written by recalculate_depreciation() / add_valuation_event()
-- below, never directly by a client.

-- ---------------------------------------------------------------------
-- Depreciation engine (mirrors apps/api/src/depreciation/depreciation-calculator.ts)
-- ---------------------------------------------------------------------
create or replace function public.recalculate_depreciation(p_asset_id uuid)
returns public.valuation_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.assets;
  v_schedule public.depreciation_schedules;
  v_current_value numeric(18, 2);
  v_period_depreciation numeric(18, 2);
  v_rate numeric(9, 6);
  v_years_elapsed numeric;
  v_event public.valuation_events;
begin
  select * into v_asset from public.assets where id = p_asset_id;
  if not found or v_asset.tenant_id <> public.auth_tenant_id() then
    raise exception 'Asset not found' using errcode = 'P0002';
  end if;
  if public.auth_role() not in ('ADMIN', 'SITE_MANAGER') then
    raise exception 'Insufficient role for this operation' using errcode = '42501';
  end if;

  select * into v_schedule from public.depreciation_schedules where asset_id = p_asset_id;
  if not found then
    raise exception 'Asset has no depreciation schedule';
  end if;

  if v_asset.depreciation_method = 'STRAIGHT_LINE' then
    if v_schedule.useful_life_years is null then
      raise exception 'Depreciation schedule is missing useful_life_years';
    end if;
    v_years_elapsed := extract(epoch from (now() - v_asset.purchase_date::timestamptz)) / (365.25 * 24 * 3600);
    v_period_depreciation := (v_asset.purchase_value - v_schedule.salvage_value) / v_schedule.useful_life_years;
    v_current_value := greatest(
      v_asset.purchase_value - v_period_depreciation * least(v_years_elapsed, v_schedule.useful_life_years),
      v_schedule.salvage_value
    );

  elsif v_asset.depreciation_method = 'DECLINING_BALANCE' then
    if v_schedule.useful_life_years is null then
      raise exception 'Depreciation schedule is missing useful_life_years';
    end if;
    v_rate := coalesce(v_schedule.rate, 2.0 / v_schedule.useful_life_years);
    v_period_depreciation := coalesce(v_schedule.last_calculated_value, v_asset.current_value) * v_rate;
    v_current_value := greatest(
      coalesce(v_schedule.last_calculated_value, v_asset.current_value) - v_period_depreciation,
      v_schedule.salvage_value
    );

  elsif v_asset.depreciation_method = 'UNITS_OF_PRODUCTION' then
    if v_schedule.total_expected_units is null then
      raise exception 'Depreciation schedule is missing total_expected_units';
    end if;
    v_period_depreciation := (v_asset.purchase_value - v_schedule.salvage_value) / v_schedule.total_expected_units;
    v_current_value := greatest(
      v_asset.purchase_value - v_period_depreciation * least(v_schedule.units_used_to_date, v_schedule.total_expected_units),
      v_schedule.salvage_value
    );
  end if;

  update public.assets set current_value = v_current_value, updated_at = now() where id = p_asset_id;
  update public.depreciation_schedules
    set last_calculated_value = v_current_value, last_run_date = now(), updated_at = now()
    where asset_id = p_asset_id;

  insert into public.valuation_events (asset_id, type, source, amount, resulting_value, created_by)
  values (p_asset_id, 'DEPRECIATION', 'SYSTEM_CALCULATED', v_period_depreciation, v_current_value, auth.uid())
  returning * into v_event;

  return v_event;
end;
$$;

-- Manual appreciation / adjustment — always logged, never silently applied.
create or replace function public.add_valuation_event(
  p_asset_id uuid,
  p_type public.valuation_event_type,
  p_amount numeric,
  p_note text default null
)
returns public.valuation_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.assets;
  v_resulting_value numeric(18, 2);
  v_event public.valuation_events;
begin
  if p_type = 'DEPRECIATION' then
    raise exception 'DEPRECIATION events can only be created by the depreciation engine';
  end if;
  if public.auth_role() <> 'ADMIN' then
    raise exception 'Insufficient role for this operation' using errcode = '42501';
  end if;

  select * into v_asset from public.assets where id = p_asset_id;
  if not found or v_asset.tenant_id <> public.auth_tenant_id() then
    raise exception 'Asset not found' using errcode = 'P0002';
  end if;

  v_resulting_value := v_asset.current_value + p_amount;

  update public.assets set current_value = v_resulting_value, updated_at = now() where id = p_asset_id;

  insert into public.valuation_events (asset_id, type, source, amount, resulting_value, note, created_by)
  values (p_asset_id, p_type, 'MANUAL_ENTRY', p_amount, v_resulting_value, p_note, auth.uid())
  returning * into v_event;

  return v_event;
end;
$$;

-- Manual stand-in for a Phase 2 telematics feed (hours/tonnage).
create or replace function public.update_asset_usage(p_asset_id uuid, p_units_used_to_date numeric)
returns public.depreciation_schedules
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset public.assets;
  v_schedule public.depreciation_schedules;
begin
  select * into v_asset from public.assets where id = p_asset_id;
  if not found or v_asset.tenant_id <> public.auth_tenant_id() then
    raise exception 'Asset not found' using errcode = 'P0002';
  end if;
  if public.auth_role() not in ('ADMIN', 'SITE_MANAGER', 'TECHNICIAN') then
    raise exception 'Insufficient role for this operation' using errcode = '42501';
  end if;

  update public.depreciation_schedules
    set units_used_to_date = p_units_used_to_date, updated_at = now()
    where asset_id = p_asset_id
    returning * into v_schedule;

  return v_schedule;
end;
$$;

-- Creates an asset and its depreciation schedule together, atomically.
-- depreciation_schedules has no direct insert policy (see above), so this
-- is the only way to create one from the client.
create or replace function public.create_asset(
  p_site_id uuid,
  p_category_id uuid,
  p_name text,
  p_serial_no text,
  p_purchase_date date,
  p_purchase_value numeric,
  p_depreciation_method public.depreciation_method,
  p_unit_of_measure public.unit_of_measure,
  p_salvage_value numeric default 0,
  p_useful_life_years int default null,
  p_total_expected_units numeric default null
)
returns public.assets
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant_id uuid;
  v_asset public.assets;
begin
  if public.auth_role() not in ('ADMIN', 'SITE_MANAGER') then
    raise exception 'Insufficient role for this operation' using errcode = '42501';
  end if;

  v_tenant_id := public.auth_tenant_id();
  if v_tenant_id is null then
    raise exception 'No tenant associated with this user';
  end if;

  if p_depreciation_method in ('STRAIGHT_LINE', 'DECLINING_BALANCE') and p_useful_life_years is null then
    raise exception 'useful_life_years is required for this depreciation method';
  end if;
  if p_depreciation_method = 'UNITS_OF_PRODUCTION' and p_total_expected_units is null then
    raise exception 'total_expected_units is required for units-of-production';
  end if;

  insert into public.assets (
    tenant_id, site_id, category_id, name, serial_no, purchase_date,
    purchase_value, current_value, depreciation_method, unit_of_measure
  ) values (
    v_tenant_id, p_site_id, p_category_id, p_name, p_serial_no, p_purchase_date,
    p_purchase_value, p_purchase_value, p_depreciation_method, p_unit_of_measure
  ) returning * into v_asset;

  insert into public.depreciation_schedules (
    asset_id, method, salvage_value, useful_life_years, total_expected_units
  ) values (
    v_asset.id, p_depreciation_method, p_salvage_value, p_useful_life_years, p_total_expected_units
  );

  return v_asset;
end;
$$;

grant execute on function public.create_asset(uuid, uuid, text, text, date, numeric, public.depreciation_method, public.unit_of_measure, numeric, int, numeric) to authenticated;
grant execute on function public.recalculate_depreciation(uuid) to authenticated;
grant execute on function public.add_valuation_event(uuid, public.valuation_event_type, numeric, text) to authenticated;
grant execute on function public.update_asset_usage(uuid, numeric) to authenticated;
