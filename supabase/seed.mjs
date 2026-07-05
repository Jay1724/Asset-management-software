// Seeds a demo tenant, four demo users (one per role), and a handful of
// sample sites/categories/assets into a fresh Supabase project.
//
// Run once after applying schema.sql:
//   cd supabase && npm install && cp .env.example .env   # fill in the two values
//   npm run seed
//
// Uses the SERVICE ROLE key, which bypasses Row-Level Security and can
// create auth users — never expose this key to a browser.
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — copy .env.example to .env and fill them in.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "password123";

async function main() {
  console.log("Upserting tenant...");
  let { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .upsert(
      {
        name: "Demo Mining Co",
        subdomain: "demo",
        primary_color: "#0f172a",
        secondary_color: "#f59e0b",
        font_family: "Inter, sans-serif",
        regulatory_region: "AU-WA",
      },
      { onConflict: "subdomain" },
    )
    .select()
    .single();
  if (tenantErr) throw tenantErr;
  console.log(`  tenant: ${tenant.id}`);

  const demoUsers = [
    ["admin@demo.test", "ADMIN", "Ada Admin"],
    ["manager@demo.test", "SITE_MANAGER", "Sam Manager"],
    ["tech@demo.test", "TECHNICIAN", "Theo Technician"],
    ["auditor@demo.test", "AUDITOR", "Ava Auditor"],
  ];

  console.log("Creating demo users...");
  for (const [email, role, fullName] of demoUsers) {
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === email);
    if (found) {
      console.log(`  ${email} already exists, skipping`);
      continue;
    }
    const { error } = await supabase.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { tenant_id: tenant.id, role, full_name: fullName },
    });
    if (error) throw error;
    console.log(`  created ${email} (${role})`);
  }

  console.log("Upserting site...");
  const { data: site, error: siteErr } = await supabase
    .from("sites")
    .upsert(
      { tenant_id: tenant.id, name: "Kalgoorlie Pit 1", location: "Kalgoorlie, WA", timezone: "Australia/Perth" },
      { onConflict: "tenant_id,name" },
    )
    .select()
    .single();
  if (siteErr) throw siteErr;

  console.log("Upserting categories...");
  const categoryDefs = [
    ["Haul Trucks", "UNITS_OF_PRODUCTION"],
    ["Excavators", "DECLINING_BALANCE"],
    ["Light Vehicles", "STRAIGHT_LINE"],
  ];
  const categories = {};
  for (const [name, method] of categoryDefs) {
    const { data, error } = await supabase
      .from("asset_categories")
      .upsert({ tenant_id: tenant.id, name, default_depreciation_method: method }, { onConflict: "tenant_id,name" })
      .select()
      .single();
    if (error) throw error;
    categories[name] = data;
  }

  console.log("Seeding assets...");
  const { count } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id);

  if (!count) {
    const assetDefs = [
      {
        site_id: site.id,
        category_id: categories["Haul Trucks"].id,
        name: "CAT 793F",
        serial_no: "SN-HT-001",
        purchase_date: "2023-01-01",
        purchase_value: 500000,
        current_value: 350000,
        depreciation_method: "UNITS_OF_PRODUCTION",
        unit_of_measure: "TONNAGE",
        schedule: { salvage_value: 50000, total_expected_units: 900000, units_used_to_date: 300000, last_calculated_value: 350000, last_run_date: new Date().toISOString() },
      },
      {
        site_id: site.id,
        category_id: categories["Excavators"].id,
        name: "Komatsu PC5500",
        serial_no: "SN-EX-002",
        purchase_date: "2022-06-01",
        purchase_value: 1200000,
        current_value: 1200000,
        depreciation_method: "DECLINING_BALANCE",
        unit_of_measure: "HOURS",
        schedule: { salvage_value: 100000, useful_life_years: 12 },
      },
      {
        site_id: site.id,
        category_id: categories["Light Vehicles"].id,
        name: "Toyota Land Cruiser",
        serial_no: "SN-LV-003",
        purchase_date: "2024-03-15",
        purchase_value: 80000,
        current_value: 80000,
        depreciation_method: "STRAIGHT_LINE",
        unit_of_measure: "CALENDAR",
        schedule: { salvage_value: 10000, useful_life_years: 7 },
      },
    ];

    for (const def of assetDefs) {
      const { schedule, ...assetFields } = def;
      const { data: asset, error: assetErr } = await supabase
        .from("assets")
        .insert({ tenant_id: tenant.id, ...assetFields })
        .select()
        .single();
      if (assetErr) throw assetErr;

      const { error: scheduleErr } = await supabase
        .from("depreciation_schedules")
        .insert({ asset_id: asset.id, method: def.depreciation_method, ...schedule });
      if (scheduleErr) throw scheduleErr;

      console.log(`  created asset ${def.name}`);
    }
  } else {
    console.log("  assets already exist, skipping");
  }

  console.log("\nDone. Demo logins (password: password123):");
  for (const [email, role] of demoUsers) console.log(`  ${email.padEnd(20)} (${role})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
