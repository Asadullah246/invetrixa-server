/*
  Warnings:

  - You are about to drop the column `moduleId` on the `PackageFeature` table. All the data in the column will be lost.
  - You are about to drop the column `actions` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `resource` on the `RolePermission` table. All the data in the column will be lost.
  - You are about to drop the column `moduleId` on the `actions` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `actions` table. All the data in the column will be lost.
  - You are about to drop the column `sortOrder` on the `modules` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "PackageFeature" DROP CONSTRAINT "PackageFeature_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "actions" DROP CONSTRAINT "actions_moduleId_fkey";

-- DropIndex
DROP INDEX "RolePermission_roleId_resource_idx";

-- DropIndex
DROP INDEX "actions_moduleId_idx";

-- AlterTable
ALTER TABLE "PackageFeature" DROP COLUMN "moduleId",
ADD COLUMN     "moduleRefId" TEXT;

-- AlterTable
ALTER TABLE "RolePermission" DROP COLUMN "actions",
DROP COLUMN "resource",
ADD COLUMN     "moduleRefId" TEXT;

-- AlterTable
ALTER TABLE "actions" DROP COLUMN "moduleId",
DROP COLUMN "sortOrder",
ADD COLUMN     "moduleRefId" TEXT;

-- AlterTable
ALTER TABLE "modules" DROP COLUMN "sortOrder";

-- CreateTable
CREATE TABLE "_ActionToRolePermission" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ActionToRolePermission_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ActionToRolePermission_B_index" ON "_ActionToRolePermission"("B");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_moduleRefId_idx" ON "RolePermission"("roleId", "moduleRefId");

-- CreateIndex
CREATE INDEX "actions_moduleRefId_idx" ON "actions"("moduleRefId");

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_moduleRefId_fkey" FOREIGN KEY ("moduleRefId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actions" ADD CONSTRAINT "actions_moduleRefId_fkey" FOREIGN KEY ("moduleRefId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageFeature" ADD CONSTRAINT "PackageFeature_moduleRefId_fkey" FOREIGN KEY ("moduleRefId") REFERENCES "modules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionToRolePermission" ADD CONSTRAINT "_ActionToRolePermission_A_fkey" FOREIGN KEY ("A") REFERENCES "actions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ActionToRolePermission" ADD CONSTRAINT "_ActionToRolePermission_B_fkey" FOREIGN KEY ("B") REFERENCES "RolePermission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
