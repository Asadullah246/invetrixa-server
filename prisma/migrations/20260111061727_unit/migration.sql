/*
  Warnings:

  - The `unitType` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "unitType",
ADD COLUMN     "unitType" VARCHAR(50) DEFAULT 'PIECE';

-- DropEnum
DROP TYPE "UnitType";

-- CreateTable
CREATE TABLE "tenant_unit_types" (
    "id" TEXT NOT NULL,
    "values" TEXT[],
    "tenantId" TEXT,

    CONSTRAINT "tenant_unit_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_unit_types_tenantId_key" ON "tenant_unit_types"("tenantId");

-- AddForeignKey
ALTER TABLE "tenant_unit_types" ADD CONSTRAINT "tenant_unit_types_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
