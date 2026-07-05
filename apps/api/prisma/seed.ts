import { PrismaClient, DepreciationMethod, Role, UnitOfMeasure } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();
const DEMO_PASSWORD = "password123";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const tenant = await prisma.tenant.upsert({
    where: { subdomain: "demo" },
    update: {},
    create: {
      name: "Demo Mining Co",
      subdomain: "demo",
      primaryColor: "#0f172a",
      secondaryColor: "#f59e0b",
      fontFamily: "Inter, sans-serif",
      regulatoryRegion: "AU-WA",
    },
  });

  // The rest of this script writes tenant-scoped rows, which RLS requires
  // app.current_tenant_id to be set for. $transaction mirrors what
  // TenantScopeInterceptor does for a real request.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenant.id}, true)`;

    for (const [role, email, fullName] of [
      [Role.ADMIN, "admin@demo.test", "Ada Admin"],
      [Role.SITE_MANAGER, "manager@demo.test", "Sam Manager"],
      [Role.TECHNICIAN, "tech@demo.test", "Theo Technician"],
      [Role.AUDITOR, "auditor@demo.test", "Ava Auditor"],
    ] as const) {
      await tx.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        update: {},
        create: { tenantId: tenant.id, email, passwordHash, role, fullName },
      });
    }

    const site = await tx.site.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Kalgoorlie Pit 1" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Kalgoorlie Pit 1",
        location: "Kalgoorlie, WA",
        timezone: "Australia/Perth",
      },
    });

    const haulTrucks = await tx.assetCategory.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Haul Trucks" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Haul Trucks",
        defaultDepreciationMethod: DepreciationMethod.UNITS_OF_PRODUCTION,
      },
    });

    const excavators = await tx.assetCategory.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Excavators" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Excavators",
        defaultDepreciationMethod: DepreciationMethod.DECLINING_BALANCE,
      },
    });

    const vehicles = await tx.assetCategory.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: "Light Vehicles" } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: "Light Vehicles",
        defaultDepreciationMethod: DepreciationMethod.STRAIGHT_LINE,
      },
    });

    const existingAssets = await tx.asset.count({ where: { tenantId: tenant.id } });
    if (existingAssets === 0) {
      await tx.asset.create({
        data: {
          tenantId: tenant.id,
          siteId: site.id,
          categoryId: haulTrucks.id,
          name: "CAT 793F",
          serialNo: "SN-HT-001",
          purchaseDate: new Date("2023-01-01"),
          purchaseValue: 500_000,
          currentValue: 350_000,
          depreciationMethod: DepreciationMethod.UNITS_OF_PRODUCTION,
          unitOfMeasure: UnitOfMeasure.TONNAGE,
          depreciationSchedule: {
            create: {
              method: DepreciationMethod.UNITS_OF_PRODUCTION,
              salvageValue: 50_000,
              totalExpectedUnits: 900_000,
              unitsUsedToDate: 300_000,
              lastCalculatedValue: 350_000,
              lastRunDate: new Date(),
            },
          },
        },
      });

      await tx.asset.create({
        data: {
          tenantId: tenant.id,
          siteId: site.id,
          categoryId: excavators.id,
          name: "Komatsu PC5500",
          serialNo: "SN-EX-002",
          purchaseDate: new Date("2022-06-01"),
          purchaseValue: 1_200_000,
          currentValue: 1_200_000,
          depreciationMethod: DepreciationMethod.DECLINING_BALANCE,
          unitOfMeasure: UnitOfMeasure.HOURS,
          depreciationSchedule: {
            create: {
              method: DepreciationMethod.DECLINING_BALANCE,
              salvageValue: 100_000,
              usefulLifeYears: 12,
            },
          },
        },
      });

      await tx.asset.create({
        data: {
          tenantId: tenant.id,
          siteId: site.id,
          categoryId: vehicles.id,
          name: "Toyota Land Cruiser",
          serialNo: "SN-LV-003",
          purchaseDate: new Date("2024-03-15"),
          purchaseValue: 80_000,
          currentValue: 80_000,
          depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
          unitOfMeasure: UnitOfMeasure.CALENDAR,
          depreciationSchedule: {
            create: {
              method: DepreciationMethod.STRAIGHT_LINE,
              salvageValue: 10_000,
              usefulLifeYears: 7,
            },
          },
        },
      });
    }
  });

  console.log(`Seeded tenant "${tenant.subdomain}". Demo logins (password: ${DEMO_PASSWORD}):`);
  console.log("  admin@demo.test      (ADMIN)");
  console.log("  manager@demo.test    (SITE_MANAGER)");
  console.log("  tech@demo.test       (TECHNICIAN)");
  console.log("  auditor@demo.test    (AUDITOR)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
