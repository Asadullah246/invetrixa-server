/*
  Warnings:

  - You are about to drop the `actions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,tenantId]` on the table `Role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[roleId,moduleRefId]` on the table `RolePermission` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,roleId,tenantId]` on the table `UserAssignment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,isAdministrator]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - Made the column `moduleRefId` on table `RolePermission` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "Role_tenantId_name_key";

-- DropIndex
DROP INDEX "UserAssignment_userId_roleId_locationId_key";

-- AlterTable
ALTER TABLE "RolePermission" ALTER COLUMN "moduleRefId" SET NOT NULL;

-- DropTable
DROP TABLE "actions";

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_tenantId_key" ON "Role"("name", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_moduleRefId_key" ON "RolePermission"("roleId", "moduleRefId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAssignment_userId_roleId_tenantId_key" ON "UserAssignment"("userId", "roleId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_name_isAdministrator_key" ON "tenants"("name", "isAdministrator");
