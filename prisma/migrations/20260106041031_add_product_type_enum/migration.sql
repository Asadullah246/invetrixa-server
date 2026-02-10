-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE', 'VARIANT');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "productType" "ProductType" NOT NULL DEFAULT 'SIMPLE';
