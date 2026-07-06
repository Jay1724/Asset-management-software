-- Dummy assets for demo purposes.
--
-- Run this in the Supabase SQL Editor the same way you ran schema.sql.
-- It assumes the "demo" tenant already exists (Table Editor → tenants,
-- or supabase/seed.mjs) — everything below is looked up by that tenant's
-- subdomain, so there's nothing to fill in.
--
-- Safe to re-run: sites/categories/assets are skipped if they already
-- exist (matched by name / serial number), so running this twice won't
-- create duplicates.

-- ---------------------------------------------------------------------
-- Sites
-- ---------------------------------------------------------------------
insert into public.sites (tenant_id, name, location, timezone)
select id, 'Kalgoorlie Pit 1', 'Kalgoorlie, WA', 'Australia/Perth'
from public.tenants where subdomain = 'demo'
on conflict (tenant_id, name) do nothing;

insert into public.sites (tenant_id, name, location, timezone)
select id, 'Newman Pit 2', 'Newman, WA', 'Australia/Perth'
from public.tenants where subdomain = 'demo'
on conflict (tenant_id, name) do nothing;

-- ---------------------------------------------------------------------
-- Asset categories
-- ---------------------------------------------------------------------
insert into public.asset_categories (tenant_id, name, default_depreciation_method)
select id, 'Haul Trucks', 'UNITS_OF_PRODUCTION' from public.tenants where subdomain = 'demo'
on conflict (tenant_id, name) do nothing;

insert into public.asset_categories (tenant_id, name, default_depreciation_method)
select id, 'Excavators', 'DECLINING_BALANCE' from public.tenants where subdomain = 'demo'
on conflict (tenant_id, name) do nothing;

insert into public.asset_categories (tenant_id, name, default_depreciation_method)
select id, 'Light Vehicles', 'STRAIGHT_LINE' from public.tenants where subdomain = 'demo'
on conflict (tenant_id, name) do nothing;

insert into public.asset_categories (tenant_id, name, default_depreciation_method)
select id, 'Drill Rigs', 'UNITS_OF_PRODUCTION' from public.tenants where subdomain = 'demo'
on conflict (tenant_id, name) do nothing;

insert into public.asset_categories (tenant_id, name, default_depreciation_method)
select id, 'Generators', 'DECLINING_BALANCE' from public.tenants where subdomain = 'demo'
on conflict (tenant_id, name) do nothing;

-- ---------------------------------------------------------------------
-- Assets — one per depreciation method per site, so the demo shows off
-- all three formulas.
-- ---------------------------------------------------------------------
insert into public.assets (tenant_id, site_id, category_id, name, serial_no, purchase_date, purchase_value, current_value, depreciation_method, unit_of_measure)
select t.id, s.id, c.id, 'CAT 793F', 'SN-HT-001', '2023-01-01', 500000, 350000, 'UNITS_OF_PRODUCTION', 'TONNAGE'
from public.tenants t
join public.sites s on s.tenant_id = t.id and s.name = 'Kalgoorlie Pit 1'
join public.asset_categories c on c.tenant_id = t.id and c.name = 'Haul Trucks'
where t.subdomain = 'demo'
on conflict (tenant_id, serial_no) do nothing;

insert into public.assets (tenant_id, site_id, category_id, name, serial_no, purchase_date, purchase_value, current_value, depreciation_method, unit_of_measure)
select t.id, s.id, c.id, 'Komatsu PC5500', 'SN-EX-002', '2022-06-01', 1200000, 1200000, 'DECLINING_BALANCE', 'HOURS'
from public.tenants t
join public.sites s on s.tenant_id = t.id and s.name = 'Kalgoorlie Pit 1'
join public.asset_categories c on c.tenant_id = t.id and c.name = 'Excavators'
where t.subdomain = 'demo'
on conflict (tenant_id, serial_no) do nothing;

insert into public.assets (tenant_id, site_id, category_id, name, serial_no, purchase_date, purchase_value, current_value, depreciation_method, unit_of_measure)
select t.id, s.id, c.id, 'Toyota Land Cruiser', 'SN-LV-003', '2024-03-15', 80000, 80000, 'STRAIGHT_LINE', 'CALENDAR'
from public.tenants t
join public.sites s on s.tenant_id = t.id and s.name = 'Kalgoorlie Pit 1'
join public.asset_categories c on c.tenant_id = t.id and c.name = 'Light Vehicles'
where t.subdomain = 'demo'
on conflict (tenant_id, serial_no) do nothing;

insert into public.assets (tenant_id, site_id, category_id, name, serial_no, purchase_date, purchase_value, current_value, depreciation_method, unit_of_measure)
select t.id, s.id, c.id, 'Sandvik DR416i', 'SN-DR-004', '2023-09-01', 750000, 750000, 'UNITS_OF_PRODUCTION', 'HOURS'
from public.tenants t
join public.sites s on s.tenant_id = t.id and s.name = 'Newman Pit 2'
join public.asset_categories c on c.tenant_id = t.id and c.name = 'Drill Rigs'
where t.subdomain = 'demo'
on conflict (tenant_id, serial_no) do nothing;

insert into public.assets (tenant_id, site_id, category_id, name, serial_no, purchase_date, purchase_value, current_value, depreciation_method, unit_of_measure)
select t.id, s.id, c.id, 'Cummins Generator Set', 'SN-GN-005', '2021-11-01', 250000, 250000, 'DECLINING_BALANCE', 'HOURS'
from public.tenants t
join public.sites s on s.tenant_id = t.id and s.name = 'Newman Pit 2'
join public.asset_categories c on c.tenant_id = t.id and c.name = 'Generators'
where t.subdomain = 'demo'
on conflict (tenant_id, serial_no) do nothing;

insert into public.assets (tenant_id, site_id, category_id, name, serial_no, purchase_date, purchase_value, current_value, depreciation_method, unit_of_measure)
select t.id, s.id, c.id, 'Ford Ranger', 'SN-LV-006', '2024-08-01', 55000, 55000, 'STRAIGHT_LINE', 'CALENDAR'
from public.tenants t
join public.sites s on s.tenant_id = t.id and s.name = 'Newman Pit 2'
join public.asset_categories c on c.tenant_id = t.id and c.name = 'Light Vehicles'
where t.subdomain = 'demo'
on conflict (tenant_id, serial_no) do nothing;

-- ---------------------------------------------------------------------
-- Depreciation schedules — one per asset above, matched by serial number.
-- Only inserted if the asset doesn't already have one (so re-running this
-- script is safe).
-- ---------------------------------------------------------------------
insert into public.depreciation_schedules (asset_id, method, salvage_value, total_expected_units, units_used_to_date, last_calculated_value, last_run_date)
select a.id, 'UNITS_OF_PRODUCTION', 50000, 900000, 300000, 350000, now()
from public.assets a where a.serial_no = 'SN-HT-001'
and not exists (select 1 from public.depreciation_schedules d where d.asset_id = a.id);

insert into public.depreciation_schedules (asset_id, method, salvage_value, useful_life_years)
select a.id, 'DECLINING_BALANCE', 100000, 12
from public.assets a where a.serial_no = 'SN-EX-002'
and not exists (select 1 from public.depreciation_schedules d where d.asset_id = a.id);

insert into public.depreciation_schedules (asset_id, method, salvage_value, useful_life_years)
select a.id, 'STRAIGHT_LINE', 10000, 7
from public.assets a where a.serial_no = 'SN-LV-003'
and not exists (select 1 from public.depreciation_schedules d where d.asset_id = a.id);

insert into public.depreciation_schedules (asset_id, method, salvage_value, total_expected_units, units_used_to_date)
select a.id, 'UNITS_OF_PRODUCTION', 75000, 50000, 0
from public.assets a where a.serial_no = 'SN-DR-004'
and not exists (select 1 from public.depreciation_schedules d where d.asset_id = a.id);

insert into public.depreciation_schedules (asset_id, method, salvage_value, useful_life_years)
select a.id, 'DECLINING_BALANCE', 25000, 10
from public.assets a where a.serial_no = 'SN-GN-005'
and not exists (select 1 from public.depreciation_schedules d where d.asset_id = a.id);

insert into public.depreciation_schedules (asset_id, method, salvage_value, useful_life_years)
select a.id, 'STRAIGHT_LINE', 8000, 5
from public.assets a where a.serial_no = 'SN-LV-006'
and not exists (select 1 from public.depreciation_schedules d where d.asset_id = a.id);

-- ---------------------------------------------------------------------
-- One pre-existing valuation event, so the CAT 793F's history tab isn't
-- empty on first look (it already reflects 300,000/900,000 tonnes used).
-- ---------------------------------------------------------------------
insert into public.valuation_events (asset_id, type, source, amount, resulting_value)
select a.id, 'DEPRECIATION', 'SYSTEM_CALCULATED', 0.5, 350000
from public.assets a where a.serial_no = 'SN-HT-001'
and not exists (select 1 from public.valuation_events v where v.asset_id = a.id);
