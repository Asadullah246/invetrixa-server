/*
  Warnings:

  - A unique constraint covering the columns `[phone,tenantId]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email,tenantId]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "customers_email_key";

-- DropIndex
DROP INDEX "customers_email_tenantId_idx";

-- DropIndex
DROP INDEX "customers_phone_key";

-- DropIndex
DROP INDEX "customers_phone_tenantId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_tenantId_key" ON "customers"("phone", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_tenantId_key" ON "customers"("email", "tenantId");
