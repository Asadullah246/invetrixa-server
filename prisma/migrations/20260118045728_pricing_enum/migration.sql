/*
  Warnings:

  - The values [AVERAGE,WAC] on the enum `PricingMethod` will be removed.
  - Existing AVERAGE and WAC values will be migrated to MOVING_AVERAGE.

*/
-- AlterEnum
BEGIN;

-- Step 1: Create the new enum type
CREATE TYPE "PricingMethod_new" AS ENUM ('LIFO', 'FIFO', 'MOVING_AVERAGE');

-- Step 2: Drop default constraints temporarily
ALTER TABLE "public"."company_settings" ALTER COLUMN "defaultPricingMethod" DROP DEFAULT;
ALTER TABLE "public"."tenants" ALTER COLUMN "defaultPricingMethod" DROP DEFAULT;

-- Step 3: Convert columns with CASE to map old values to new
-- Products table (pricingMethod can be null)
ALTER TABLE "products" ALTER COLUMN "pricingMethod" TYPE "PricingMethod_new" 
  USING (
    CASE "pricingMethod"::text
      WHEN 'AVERAGE' THEN 'MOVING_AVERAGE'
      WHEN 'WAC' THEN 'MOVING_AVERAGE'
      ELSE "pricingMethod"::text
    END::"PricingMethod_new"
  );

-- Tenants table
ALTER TABLE "tenants" ALTER COLUMN "defaultPricingMethod" TYPE "PricingMethod_new" 
  USING (
    CASE "defaultPricingMethod"::text
      WHEN 'AVERAGE' THEN 'MOVING_AVERAGE'
      WHEN 'WAC' THEN 'MOVING_AVERAGE'
      ELSE "defaultPricingMethod"::text
    END::"PricingMethod_new"
  );

-- Company settings table
ALTER TABLE "company_settings" ALTER COLUMN "defaultPricingMethod" TYPE "PricingMethod_new" 
  USING (
    CASE "defaultPricingMethod"::text
      WHEN 'AVERAGE' THEN 'MOVING_AVERAGE'
      WHEN 'WAC' THEN 'MOVING_AVERAGE'
      ELSE "defaultPricingMethod"::text
    END::"PricingMethod_new"
  );

-- Step 4: Swap enum names and drop old type
ALTER TYPE "PricingMethod" RENAME TO "PricingMethod_old";
ALTER TYPE "PricingMethod_new" RENAME TO "PricingMethod";
DROP TYPE "public"."PricingMethod_old";

-- Step 5: Restore defaults
ALTER TABLE "company_settings" ALTER COLUMN "defaultPricingMethod" SET DEFAULT 'MOVING_AVERAGE';
ALTER TABLE "tenants" ALTER COLUMN "defaultPricingMethod" SET DEFAULT 'FIFO';

COMMIT;
