-- AlterTable
ALTER TABLE "products" ADD COLUMN     "pricingMethod" "PricingMethod";

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "defaultPricingMethod" "PricingMethod" NOT NULL DEFAULT 'FIFO';
