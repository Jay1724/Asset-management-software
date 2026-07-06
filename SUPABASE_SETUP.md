# Supabase setup

This gets `index.html` running as a real, hosted, login-protected web app —
no server for you to run. The page talks directly to a Supabase project
(Postgres + Auth + Row-Level Security) from the browser.

## 1. Create a project

Go to [supabase.com](https://supabase.com), sign in, and create a new
project (the free tier is enough for this). Wait for it to finish
provisioning (~2 minutes).

## 2. Run the schema

In the project dashboard: **SQL Editor → New query**, paste the entire
contents of [`supabase/schema.sql`](supabase/schema.sql), and run it. This
creates all the tables, Row-Level Security policies, and the RPC functions
the frontend calls for depreciation and valuation events. It's safe to
re-run on a fresh project; running it twice on the same project will error
on the second run since it isn't idempotent (drop the tables first if you
need to start over).

## 3. Seed demo data

There are two ways to do this — pick whichever you're more comfortable
with. Either way, do the tenant + one admin user first (option B, steps
1–3) since assets need somewhere to belong to.

**Option A — no terminal needed, dashboard only:**
1. **Table Editor → tenants** → Insert row: `name` = `Demo Mining Co`,
   `subdomain` = `demo`. Copy the generated `id`.
2. **Authentication → Users → Add user**: create an email/password,
   toggle **Auto Confirm User** on.
3. **Table Editor → profiles**: find the row with that user's id (a
   trigger creates it automatically), set `tenant_id` to the id from
   step 1 and `role` to `ADMIN`.
4. Log into `index.html` with that account and create sites/categories/
   assets through the app's own forms — or, for a quick set of sample
   assets, paste [`supabase/seed-demo-assets.sql`](supabase/seed-demo-assets.sql)
   into the SQL Editor and run it (safe to re-run; it skips anything
   that already exists).

**Option B — terminal, creates 4 role accounts + sample assets in one go:**

```bash
cd supabase
npm install
cp .env.example .env
```

Edit `.env` and fill in:
- `SUPABASE_URL` — Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — Project Settings → API → service_role key
  (**secret** — this bypasses Row-Level Security; never put it in
  `index.html` or commit it)

Then run:

```bash
npm run seed
```

This creates the demo logins (password `password123` for all):
`admin@demo.test`, `manager@demo.test`, `tech@demo.test`, `auditor@demo.test`,
plus a starter site/category/asset. Layer
[`supabase/seed-demo-assets.sql`](supabase/seed-demo-assets.sql) on top
any time for a fuller set of demo assets across all three depreciation
methods.

## 4. Wire up the frontend

Project Settings → API → copy the **Project URL** and the **anon public**
key (not the service role key — the anon key is safe to expose in
client-side code; RLS is what actually protects the data).

Open `index.html` and set:

```js
const SUPABASE_URL = "https://xxxxxxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "ey...";
```

Save the file. Open it in a browser (or push it to GitHub Pages — see the
README) and sign in with one of the demo accounts above.

## How it fits together

- **Auth**: real Supabase Auth (email/password). A Postgres trigger
  (`handle_new_user()` in schema.sql) auto-creates a `profiles` row for
  every new auth user, populated from the `tenant_id` / `role` /
  `full_name` passed in at signup (that's what `supabase/seed.mjs` does
  via the admin API).
- **Multi-tenancy & RBAC**: enforced by Postgres Row-Level Security,
  keyed on the signed-in user's `profiles.tenant_id` / `profiles.role`
  (see `auth_tenant_id()` / `auth_role()` in schema.sql). This is the same
  isolation guarantee as the NestJS version's RLS migration, just without
  a Node backend in front of it.
- **Depreciation engine**: lives in Postgres as `SECURITY DEFINER`
  functions (`recalculate_depreciation`, `add_valuation_event`,
  `update_asset_usage`, `create_asset`), called from the browser via
  `supabase.rpc(...)`. Keeping the multi-table read/compute/write logic in
  the database (rather than duplicating it in client JS) keeps it
  atomic and makes it the single source of truth, mirroring what
  `apps/api/src/depreciation/depreciation-calculator.ts` does for the
  NestJS version.
- **White-label theming**: `tenants` is publicly readable (no auth
  required) so the sign-in screen can show the right logo/colors before
  anyone logs in; every other table requires auth + RLS.

## What this doesn't do (yet)

Same scope boundary as the rest of this repo: resource allocation,
expiry/compliance tracking, a full audit log, and telematics ingestion
aren't built. See the main [README](README.md) for the full picture,
including the original NestJS + Next.js implementation this Supabase
version was adapted from.
