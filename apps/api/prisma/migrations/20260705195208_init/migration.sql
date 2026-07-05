-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SITE_MANAGER', 'TECHNICIAN', 'AUDITOR');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'UNITS_OF_PRODUCTION');

-- CreateEnum
CREATE TYPE "UnitOfMeasure" AS ENUM ('CALENDAR', 'HOURS', 'TONNAGE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'DECOMMISSIONED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "ValuationEventType" AS ENUM ('DEPRECIATION', 'APPRECIATION', 'MANUAL_ADJUSTMENT', 'MARKET_FEED');

-- CreateEnum
CREATE TYPE "ValuationSource" AS ENUM ('SYSTEM_CALCULATED', 'MANUAL_ENTRY', 'MARKET_FEED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "logo_url" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#0f172a',
    "secondary_color" TEXT NOT NULL DEFAULT '#2563eb',
    "font_family" TEXT NOT NULL DEFAULT 'Inter, sans-serif',
    "regulatory_region" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'TECHNICIAN',
    "site_id" TEXT,
    "full_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "default_depreciation_method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serial_no" TEXT NOT NULL,
    "purchase_date" TIMESTAMP(3) NOT NULL,
    "purchase_value" DECIMAL(18,2) NOT NULL,
    "current_value" DECIMAL(18,2) NOT NULL,
    "depreciation_method" "DepreciationMethod" NOT NULL,
    "unit_of_measure" "UnitOfMeasure" NOT NULL DEFAULT 'CALENDAR',
    "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_schedules" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "method" "DepreciationMethod" NOT NULL,
    "rate" DECIMAL(9,6),
    "useful_life_years" INTEGER,
    "salvage_value" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_expected_units" DECIMAL(18,2),
    "units_used_to_date" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "last_calculated_value" DECIMAL(18,2),
    "last_run_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "depreciation_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuation_events" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "type" "ValuationEventType" NOT NULL,
    "source" "ValuationSource" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "resulting_value" DECIMAL(18,2) NOT NULL,
    "note" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valuation_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_subdomain_key" ON "tenants"("subdomain");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "sites_tenant_id_idx" ON "sites"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_tenant_id_name_key" ON "sites"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "asset_categories_tenant_id_idx" ON "asset_categories"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_tenant_id_name_key" ON "asset_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "assets_tenant_id_idx" ON "assets"("tenant_id");

-- CreateIndex
CREATE INDEX "assets_tenant_id_site_id_idx" ON "assets"("tenant_id", "site_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_tenant_id_serial_no_key" ON "assets"("tenant_id", "serial_no");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_schedules_asset_id_key" ON "depreciation_schedules"("asset_id");

-- CreateIndex
CREATE INDEX "valuation_events_asset_id_idx" ON "valuation_events"("asset_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_schedules" ADD CONSTRAINT "depreciation_schedules_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_events" ADD CONSTRAINT "valuation_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
