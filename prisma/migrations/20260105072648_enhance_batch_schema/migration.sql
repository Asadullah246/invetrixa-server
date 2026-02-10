/*
  Warnings:

  - You are about to drop the column `unitCost` on the `batches` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "batches" DROP COLUMN "unitCost",
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "purchaseUnitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sellingPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0;
