/*
  Warnings:

  - You are about to drop the column `cratedAt` on the `addresses` table. All the data in the column will be lost.
  - You are about to drop the column `pricingMethod` on the `company_settings` table. All the data in the column will be lost.
  - Added the required column `label` to the `PackageFeature` table without a default value. This is not possible if the table is not empty.
  - Added the required column `moduleId` to the `PackageFeature` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tenants_businessEmail_key";

-- DropIndex
DROP INDEX "tenants_companyType_idx";

-- DropIndex
DROP INDEX "tenants_industry_idx";

-- AlterTable
ALTER TABLE "PackageFeature" ADD COLUMN     "description" TEXT,
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "moduleId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "addresses" DROP COLUMN "cratedAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "company_settings" DROP COLUMN "pricingMethod",
ADD COLUMN     "defaultPricingMethod" "PricingMethod" NOT NULL DEFAULT 'AVERAGE';

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "registrationNumber" DROP NOT NULL,
ALTER COLUMN "website" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "tenants_isDeleted_idx" ON "tenants"("isDeleted");

-- AddForeignKey
ALTER TABLE "PackageFeature" ADD CONSTRAINT "PackageFeature_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
