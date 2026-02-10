-- CreateEnum
CREATE TYPE "MarkupType" AS ENUM ('PERCENT', 'FIXED_AMOUNT', 'MANUAL');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "markupType" "MarkupType",
ADD COLUMN     "markupValue" DECIMAL(10,4),
ADD COLUMN     "maxSellingPrice" DECIMAL(15,4),
ADD COLUMN     "minSellingPrice" DECIMAL(15,4),
ADD COLUMN     "sellingPrice" DECIMAL(15,4);
