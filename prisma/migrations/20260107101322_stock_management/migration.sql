/*
  Warnings:

  - Made the column `locationId` on table `stock_movements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `referenceType` on table `stock_movements` required. This step will fail if there are existing NULL values in that column.
  - Made the column `movementType` on table `stock_movements` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "stock_movements" ALTER COLUMN "locationId" SET NOT NULL,
ALTER COLUMN "referenceType" SET NOT NULL,
ALTER COLUMN "movementType" SET NOT NULL;
