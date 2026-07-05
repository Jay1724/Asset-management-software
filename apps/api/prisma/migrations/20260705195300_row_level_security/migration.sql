-- Row-level tenant isolation.
--
-- Every request sets a transaction-local session variable
-- `app.current_tenant_id` (see src/common/middleware/tenant.middleware.ts
-- and src/prisma/prisma.service.ts) before running any query. These
-- policies make Postgres itself refuse to return or write rows for any
-- other tenant, so a bug in application-level filtering can't leak data
-- across tenants.
--
-- FORCE ROW LEVEL SECURITY is required because the app connects as the
-- table owner (needed for migrations); without FORCE, RLS is bypassed for
-- the owning role.

CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS TEXT AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')
$$ LANGUAGE sql STABLE;

-- Directly tenant-scoped tables ---------------------------------------

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "users"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());

ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sites" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "sites"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());

ALTER TABLE "asset_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "asset_categories" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "asset_categories"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());

ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assets" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "assets"
  USING ("tenant_id" = current_tenant_id())
  WITH CHECK ("tenant_id" = current_tenant_id());

-- Child tables without their own tenant_id: scope via the parent asset --

ALTER TABLE "depreciation_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "depreciation_schedules" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "depreciation_schedules"
  USING (EXISTS (
    SELECT 1 FROM "assets"
    WHERE "assets"."id" = "depreciation_schedules"."asset_id"
      AND "assets"."tenant_id" = current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "assets"
    WHERE "assets"."id" = "depreciation_schedules"."asset_id"
      AND "assets"."tenant_id" = current_tenant_id()
  ));

ALTER TABLE "valuation_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "valuation_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "valuation_events"
  USING (EXISTS (
    SELECT 1 FROM "assets"
    WHERE "assets"."id" = "valuation_events"."asset_id"
      AND "assets"."tenant_id" = current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "assets"
    WHERE "assets"."id" = "valuation_events"."asset_id"
      AND "assets"."tenant_id" = current_tenant_id()
  ));

-- The tenants table itself is not tenant-scoped (it defines tenants), so
-- no RLS policy is applied here; access to it is restricted at the
-- application layer (only resolvable by subdomain, never listed cross-tenant).
