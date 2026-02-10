/*
  Stock Management Migration - Manually Fixed
  
  This migration restructures the stock management system:
  - Replaces old batch_locations with new inventory_balances, valuation_layers
  - Adds stock transfers, reservations
  - Updates enums and table structures
*/

-- ============================================
-- STEP 1: Drop foreign keys first (dependencies)
-- ============================================

-- DropForeignKey
ALTER TABLE "UserAssignment" DROP CONSTRAINT IF EXISTS "UserAssignment_locationId_fkey";

-- DropForeignKey
ALTER TABLE "batch_locations" DROP CONSTRAINT IF EXISTS "batch_locations_batchId_fkey";

-- DropForeignKey
ALTER TABLE "batch_locations" DROP CONSTRAINT IF EXISTS "batch_locations_locationId_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_batchId_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_fromLocationId_fkey";

-- DropForeignKey
ALTER TABLE "stock_movements" DROP CONSTRAINT IF EXISTS "stock_movements_toLocationId_fkey";

-- ============================================
-- STEP 2: Drop tables that use old enums BEFORE altering enums
-- ============================================

-- DropTable (must drop BEFORE altering BatchStatus enum)
DROP TABLE IF EXISTS "batch_locations";

-- DropTable
DROP TABLE IF EXISTS "Location";

-- ============================================
-- STEP 3: Drop old indexes
-- ============================================

-- DropIndex
DROP INDEX IF EXISTS "batches_batchNumber_tenantId_key";
DROP INDEX IF EXISTS "stock_movements_batchId_idx";
DROP INDEX IF EXISTS "stock_movements_fromLocationId_idx";
DROP INDEX IF EXISTS "stock_movements_productId_idx";
DROP INDEX IF EXISTS "stock_movements_toLocationId_idx";

-- ============================================
-- STEP 4: Create new enums
-- ============================================

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "StockReferenceType" AS ENUM ('PURCHASE', 'SALE', 'TRANSFER', 'RETURN', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('DRAFT', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'FULFILLED', 'EXPIRED');

-- ============================================
-- STEP 5: Alter existing enums (now safe - batch_locations is dropped)
-- ============================================

-- AlterEnum BatchStatus
CREATE TYPE "BatchStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'QUARANTINE', 'RECALLED');
ALTER TABLE "batches" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "batches" ALTER COLUMN "status" TYPE "BatchStatus_new" USING (
  CASE 
    WHEN "status"::text = 'IN_TRANSIT' THEN 'ACTIVE'
    ELSE "status"::text
  END
)::"BatchStatus_new";
ALTER TYPE "BatchStatus" RENAME TO "BatchStatus_old";
ALTER TYPE "BatchStatus_new" RENAME TO "BatchStatus";
DROP TYPE "BatchStatus_old";
ALTER TABLE "batches" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterEnum StockMovementStatus
CREATE TYPE "StockMovementStatus_new" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');
ALTER TABLE "stock_movements" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "stock_movements" ALTER COLUMN "status" TYPE "StockMovementStatus_new" USING (
  CASE 
    WHEN "status"::text = 'IN_TRANSIT' THEN 'PENDING'
    ELSE "status"::text
  END
)::"StockMovementStatus_new";
ALTER TYPE "StockMovementStatus" RENAME TO "StockMovementStatus_old";
ALTER TYPE "StockMovementStatus_new" RENAME TO "StockMovementStatus";
DROP TYPE "StockMovementStatus_old";
ALTER TABLE "stock_movements" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

-- ============================================
-- STEP 6: Alter existing tables
-- ============================================

-- AlterTable batches
ALTER TABLE "batches" DROP COLUMN IF EXISTS "purchaseUnitCost",
DROP COLUMN IF EXISTS "sellingPrice",
DROP COLUMN IF EXISTS "totalCost",
DROP COLUMN IF EXISTS "totalQuantity",
ADD COLUMN IF NOT EXISTS "certificateUrl" TEXT,
ADD COLUMN IF NOT EXISTS "supplierName" VARCHAR(255);

-- AlterTable stock_movements - drop columns including movementType (which uses old enum)
ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "movementType";
ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "batchId",
DROP COLUMN IF EXISTS "fromLocationId",
DROP COLUMN IF EXISTS "shippingCost",
DROP COLUMN IF EXISTS "toLocationId",
DROP COLUMN IF EXISTS "updatedAt";

-- Now safe to drop the old enum type
DROP TYPE IF EXISTS "MovementType";

-- Add new columns with defaults for migration
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "locationId" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "referenceType" "StockReferenceType";
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "transferId" TEXT;

-- Add new movementType column with new enum type
ALTER TABLE "stock_movements" DROP COLUMN IF EXISTS "movementType";
ALTER TABLE "stock_movements" ADD COLUMN "movementType" "StockMovementType";

-- Alter existing columns
ALTER TABLE "stock_movements" ALTER COLUMN "unitCost" DROP DEFAULT;
ALTER TABLE "stock_movements" ALTER COLUMN "unitCost" SET DATA TYPE DECIMAL(12,4);
ALTER TABLE "stock_movements" ALTER COLUMN "totalCost" DROP DEFAULT;
ALTER TABLE "stock_movements" ALTER COLUMN "totalCost" SET DATA TYPE DECIMAL(14,4);
ALTER TABLE "stock_movements" ALTER COLUMN "status" SET DEFAULT 'COMPLETED';

-- ============================================
-- STEP 7: Create new tables
-- ============================================

-- CreateTable locations
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50),
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable inventory_balances
CREATE TABLE "inventory_balances" (
    "id" TEXT NOT NULL,
    "onHandQuantity" INTEGER NOT NULL DEFAULT 0,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable valuation_layers
CREATE TABLE "valuation_layers" (
    "id" TEXT NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "originalQty" INTEGER NOT NULL,
    "remainingQty" INTEGER NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchId" TEXT,

    CONSTRAINT "valuation_layers_pkey" PRIMARY KEY ("id")
);

-- CreateTable valuation_layer_consumptions
CREATE TABLE "valuation_layer_consumptions" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(12,4) NOT NULL,
    "valuationLayerId" TEXT NOT NULL,
    "stockMovementId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "valuation_layer_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable stock_transfers
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "transferNumber" VARCHAR(50) NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'DRAFT',
    "shippedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "note" TEXT,
    "metadata" JSONB,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable stock_transfer_items
CREATE TABLE "stock_transfer_items" (
    "id" TEXT NOT NULL,
    "requestedQuantity" INTEGER NOT NULL,
    "shippedQuantity" INTEGER NOT NULL DEFAULT 0,
    "receivedQuantity" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "productId" TEXT NOT NULL,
    "transferId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_transfer_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable stock_reservations
CREATE TABLE "stock_reservations" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "referenceType" VARCHAR(50),
    "referenceId" TEXT,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- STEP 8: Create indexes
-- ============================================

-- CreateIndex locations
CREATE INDEX "locations_tenantId_idx" ON "locations"("tenantId");
CREATE INDEX "locations_isActive_idx" ON "locations"("isActive");
CREATE UNIQUE INDEX "locations_code_tenantId_key" ON "locations"("code", "tenantId");

-- CreateIndex inventory_balances
CREATE INDEX "inventory_balances_productId_idx" ON "inventory_balances"("productId");
CREATE INDEX "inventory_balances_locationId_idx" ON "inventory_balances"("locationId");
CREATE INDEX "inventory_balances_tenantId_idx" ON "inventory_balances"("tenantId");
CREATE INDEX "inventory_balances_onHandQuantity_idx" ON "inventory_balances"("onHandQuantity");
CREATE UNIQUE INDEX "inventory_balances_productId_locationId_key" ON "inventory_balances"("productId", "locationId");

-- CreateIndex valuation_layers
CREATE INDEX "valuation_layers_productId_locationId_createdAt_idx" ON "valuation_layers"("productId", "locationId", "createdAt");
CREATE INDEX "valuation_layers_productId_locationId_remainingQty_idx" ON "valuation_layers"("productId", "locationId", "remainingQty");
CREATE INDEX "valuation_layers_tenantId_idx" ON "valuation_layers"("tenantId");

-- CreateIndex valuation_layer_consumptions
CREATE INDEX "valuation_layer_consumptions_valuationLayerId_idx" ON "valuation_layer_consumptions"("valuationLayerId");
CREATE INDEX "valuation_layer_consumptions_stockMovementId_idx" ON "valuation_layer_consumptions"("stockMovementId");

-- CreateIndex stock_transfers
CREATE INDEX "stock_transfers_fromLocationId_idx" ON "stock_transfers"("fromLocationId");
CREATE INDEX "stock_transfers_toLocationId_idx" ON "stock_transfers"("toLocationId");
CREATE INDEX "stock_transfers_status_idx" ON "stock_transfers"("status");
CREATE INDEX "stock_transfers_tenantId_idx" ON "stock_transfers"("tenantId");
CREATE UNIQUE INDEX "stock_transfers_transferNumber_tenantId_key" ON "stock_transfers"("transferNumber", "tenantId");

-- CreateIndex stock_transfer_items
CREATE INDEX "stock_transfer_items_transferId_idx" ON "stock_transfer_items"("transferId");
CREATE INDEX "stock_transfer_items_productId_idx" ON "stock_transfer_items"("productId");
CREATE UNIQUE INDEX "stock_transfer_items_transferId_productId_key" ON "stock_transfer_items"("transferId", "productId");

-- CreateIndex stock_reservations
CREATE INDEX "stock_reservations_productId_locationId_idx" ON "stock_reservations"("productId", "locationId");
CREATE INDEX "stock_reservations_expiresAt_idx" ON "stock_reservations"("expiresAt");
CREATE INDEX "stock_reservations_status_idx" ON "stock_reservations"("status");
CREATE INDEX "stock_reservations_referenceType_referenceId_idx" ON "stock_reservations"("referenceType", "referenceId");
CREATE INDEX "stock_reservations_tenantId_idx" ON "stock_reservations"("tenantId");

-- CreateIndex batches
CREATE UNIQUE INDEX "batches_batchNumber_productId_tenantId_key" ON "batches"("batchNumber", "productId", "tenantId");

-- CreateIndex stock_movements
CREATE INDEX "stock_movements_productId_locationId_idx" ON "stock_movements"("productId", "locationId");
CREATE INDEX "stock_movements_referenceType_referenceId_idx" ON "stock_movements"("referenceType", "referenceId");
CREATE INDEX "stock_movements_transferId_idx" ON "stock_movements"("transferId");
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt");
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movementType");

-- ============================================
-- STEP 9: Add foreign keys
-- ============================================

-- AddForeignKey UserAssignment -> locations
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey locations
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey inventory_balances
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey valuation_layers
ALTER TABLE "valuation_layers" ADD CONSTRAINT "valuation_layers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "valuation_layers" ADD CONSTRAINT "valuation_layers_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "valuation_layers" ADD CONSTRAINT "valuation_layers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "valuation_layers" ADD CONSTRAINT "valuation_layers_sourceMovementId_fkey" FOREIGN KEY ("sourceMovementId") REFERENCES "stock_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "valuation_layers" ADD CONSTRAINT "valuation_layers_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey valuation_layer_consumptions
ALTER TABLE "valuation_layer_consumptions" ADD CONSTRAINT "valuation_layer_consumptions_valuationLayerId_fkey" FOREIGN KEY ("valuationLayerId") REFERENCES "valuation_layers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "valuation_layer_consumptions" ADD CONSTRAINT "valuation_layer_consumptions_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "stock_movements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey stock_movements
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey stock_transfers
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey stock_transfer_items
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "stock_transfers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey stock_reservations
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
