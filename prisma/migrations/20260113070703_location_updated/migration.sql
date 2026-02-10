/*
  Warnings:

  - You are about to drop the column `address` on the `locations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `locations` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE', 'STORAGE');

-- CreateEnum
CREATE TYPE "LocationSubType" AS ENUM ('ONLINE', 'PHYSICAL', 'HYBRID');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CLOSED');

-- DropIndex
DROP INDEX "locations_isActive_idx";

-- AlterTable
ALTER TABLE "locations" DROP COLUMN "address",
DROP COLUMN "isActive",
ADD COLUMN     "businessHours" VARCHAR(255) NOT NULL DEFAULT '9:00 AM - 5:00 PM',
ADD COLUMN     "createdByUserId" TEXT,
ADD COLUMN     "email" VARCHAR(255) NOT NULL DEFAULT 'demo@gmail.com',
ADD COLUMN     "establishedYear" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "phone" VARCHAR(255) NOT NULL DEFAULT '1234567890',
ADD COLUMN     "status" "LocationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "subType" "LocationSubType" NOT NULL DEFAULT 'PHYSICAL',
ADD COLUMN     "totalCapacity" INTEGER,
ADD COLUMN     "type" "LocationType" NOT NULL DEFAULT 'WAREHOUSE';

-- CreateIndex
CREATE INDEX "locations_createdByUserId_idx" ON "locations"("createdByUserId");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
