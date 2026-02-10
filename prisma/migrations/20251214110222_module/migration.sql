/*
  Warnings:

  - You are about to drop the column `createdAt` on the `actions` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `actions` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `actions` table. All the data in the column will be lost.
  - You are about to drop the column `moduleRefId` on the `actions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `actions` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `modules` table. All the data in the column will be lost.
  - You are about to drop the `_ActionToRolePermission` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_ActionToRolePermission" DROP CONSTRAINT "_ActionToRolePermission_A_fkey";

-- DropForeignKey
ALTER TABLE "_ActionToRolePermission" DROP CONSTRAINT "_ActionToRolePermission_B_fkey";

-- DropForeignKey
ALTER TABLE "actions" DROP CONSTRAINT "actions_moduleRefId_fkey";

-- DropIndex
DROP INDEX "actions_isActive_idx";

-- DropIndex
DROP INDEX "actions_moduleRefId_idx";

-- DropIndex
DROP INDEX "modules_isActive_idx";

-- AlterTable
ALTER TABLE "RolePermission" ADD COLUMN     "actions" TEXT[];

-- AlterTable
ALTER TABLE "actions" DROP COLUMN "createdAt",
DROP COLUMN "description",
DROP COLUMN "isActive",
DROP COLUMN "moduleRefId",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "modules" DROP COLUMN "isActive",
ADD COLUMN     "actions" TEXT[];

-- DropTable
DROP TABLE "_ActionToRolePermission";
