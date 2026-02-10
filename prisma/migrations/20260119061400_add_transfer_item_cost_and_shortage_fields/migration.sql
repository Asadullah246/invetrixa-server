-- AlterTable
ALTER TABLE "stock_transfer_items" ADD COLUMN     "shippedUnitCost" DECIMAL(12,4) DEFAULT 0,
ADD COLUMN     "shortageReason" TEXT;
