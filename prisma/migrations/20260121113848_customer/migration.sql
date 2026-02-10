/*
  Warnings:

  - You are about to drop the column `contactName` on the `customer_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `customer_addresses` table. All the data in the column will be lost.
  - You are about to drop the column `creditLimit` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `paymentTermsDays` on the `customers` table. All the data in the column will be lost.
  - Made the column `phone` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customer_addresses" DROP COLUMN "contactName",
DROP COLUMN "contactPhone",
ALTER COLUMN "addressLine1" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "postalCode" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "creditLimit",
DROP COLUMN "paymentTermsDays",
ALTER COLUMN "phone" SET NOT NULL;
