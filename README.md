# Mining Asset Management Platform

White-label, multi-tenant asset management for mining operations: automated
depreciation, resource allocation, expiry/compliance tracking, and
telematics integration. This repo currently implements the foundational
slice of the platform — multi-tenancy, auth, white-label theming, core
asset CRUD, and the full depreciation engine — described in the product
spec. See "What's built vs. what's next" below for scope.

## Architecture

Monorepo (npm workspaces):

```
apps/api/       NestJS backend (REST API, Postgres via Prisma)
apps/web/       Next.js frontend (SSR, per-tenant theming)
packages/shared/ TypeScript types shared by both apps (enums, DTOs shapes)
```

**Multi-tenancy.** Every tenant-scoped table (`users`, `sites`,
`asset_categories`, `assets`, `depreciation_schedules`, `valuation_events`)
has a Postgres Row-Level Security policy keyed on the session variable
`app.current_tenant_id` (see
`apps/api/prisma/migrations/*_row_level_security/migration.sql`). On every
request:

1. `TenantMiddleware` resolves the tenant from the `Host` header's
   subdomain (or an `X-Tenant-Subdomain` header, used locally where
   subdomains aren't wired up to DNS).
2. `TenantScopeInterceptor` opens one Postgres transaction for the whole
   request, sets `app.current_tenant_id` for that transaction, and stores
   the transaction client in `AsyncLocalStorage`.
3. `TenantPrismaService` hands that scoped client to any service that
   needs it — so even a bug in application-level `WHERE tenantId = ...`
   filtering can't leak another tenant's rows; the database enforces it.

**Auth.** Email/password login, JWT bearer tokens, role-based guards for
Admin / Site Manager / Technician / Auditor (`apps/api/src/auth`). The JWT
payload's `tenantId` is checked against the request's resolved tenant on
every call, so a token minted for one tenant is rejected on another
tenant's subdomain. This is structured so the password-based `AuthService`
can be swapped for a Keycloak/Auth0 OIDC strategy later without touching
the guards or RBAC decorators.

**White-labeling.** `GET /tenant/theme` (unauthenticated) returns a
tenant's logo/colors/font. `apps/web/src/app/layout.tsx` fetches this
server-side on every request and injects it as CSS custom properties
(`--tenant-primary-color`, etc.), which Tailwind config maps to
`bg-tenant-primary` / `font-tenant` utility classes.

**Depreciation engine** (`apps/api/src/depreciation/depreciation-calculator.ts`).
Pure functions for straight-line, declining-balance, and
units-of-production, matching the formulas in the product spec, unit
tested against known examples. `AssetsService.recalculateDepreciation`
runs the engine for one period and writes an immutable `ValuationEvent`
(never mutates history) alongside updating the asset's live
`currentValue`. Manual appreciation/adjustments go through
`AssetsService.addValuationEvent` — always logged, never silently applied,
per spec.

## What's built vs. what's next

Built:
- Multi-tenant scaffolding, subdomain resolution, Postgres RLS
- JWT auth + RBAC (Admin/Site Manager/Technician/Auditor)
- White-label theming (API + Next.js CSS var injection)
- Site / Asset Category / Asset CRUD (API + UI)
- Depreciation engine: straight-line, declining-balance, units-of-production
- Immutable `ValuationEvent` ledger (system-calculated and manual entries)

Not yet built (see spec sections 2.5–2.8, and build sequence steps 4–7):
- Resource allocation (check-out/check-in workflow)
- Expiry/compliance tracking + tiered alerting
- Audit log across all entities
- Telematics feed ingestion (would populate `unitsUsedToDate` automatically
  instead of the manual "Update usage" form currently standing in for it)
- Regulatory compliance report generation, multi-currency rollups
- Keycloak/Auth0 SSO (current auth is email/password JWT, deliberately
  structured to swap in an OIDC strategy later)
- Offline-first PWA support

## Running locally

### 1. Database

```bash
docker compose up -d postgres
```

### 2. API

```bash
cd apps/api
cp .env.example .env   # adjust DATABASE_URL if not using docker-compose defaults
npm install
npm run prisma:generate
npm run prisma:deploy   # applies existing migrations, including RLS policies
npm run seed             # creates a "demo" tenant with sample users/assets
npm run start:dev        # http://localhost:4000
```

Seeded logins for the `demo` tenant (password `password123` for all):
`admin@demo.test`, `manager@demo.test`, `tech@demo.test`, `auditor@demo.test`.

### 3. Web

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev   # http://localhost:3000
```

Locally there's no real DNS subdomain, so visit
`http://localhost:3000/?tenant=demo` once — this sets a cookie that
`middleware.ts` and the API client use for the rest of the session. In
production each tenant gets a real subdomain and this step isn't needed.

### Tests

```bash
cd apps/api
npm test   # depreciation engine unit tests
```

## Notes on the RLS migration

The RLS policy migration
(`apps/api/prisma/migrations/*_row_level_security/migration.sql`) is plain
SQL run after Prisma's auto-generated `CREATE TABLE` migration, because
Prisma's schema language has no concept of RLS policies. It's tracked and
applied like any other migration via `prisma migrate deploy`. If you add a
new tenant-scoped model, add a matching policy in a new migration —
`prisma migrate dev` will never do this for you.
