/*
  Warnings:

  - You are about to alter the column `name` on the `Role` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(50)`.
  - You are about to alter the column `description` on the `Role` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - A unique constraint covering the columns `[userId,roleId,tenantId,locationId]` on the table `UserAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('TENANT', 'LOCATION');

-- DropIndex
DROP INDEX "UserAssignment_userId_roleId_tenantId_key";

-- AlterTable
ALTER TABLE "Role" ALTER COLUMN "name" SET DATA TYPE VARCHAR(50),
ALTER COLUMN "description" SET DATA TYPE VARCHAR(255);

-- AlterTable
ALTER TABLE "UserAssignment" ADD COLUMN     "accessScope" "AccessScope" NOT NULL DEFAULT 'TENANT';

-- CreateIndex
CREATE UNIQUE INDEX "UserAssignment_userId_roleId_tenantId_locationId_key" ON "UserAssignment"("userId", "roleId", "tenantId", "locationId");
