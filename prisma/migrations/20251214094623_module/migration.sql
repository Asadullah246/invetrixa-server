/*
  Warnings:

  - You are about to drop the column `key` on the `modules` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name]` on the table `modules` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "modules_key_idx";

-- DropIndex
DROP INDEX "modules_key_key";

-- AlterTable
ALTER TABLE "modules" DROP COLUMN "key";

-- CreateIndex
CREATE UNIQUE INDEX "modules_name_key" ON "modules"("name");

-- CreateIndex
CREATE INDEX "modules_name_idx" ON "modules"("name");
