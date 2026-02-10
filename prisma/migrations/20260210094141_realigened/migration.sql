/*
  Warnings:

  - You are about to drop the column `pxlhutEmails` on the `user_preferences` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_preferences" DROP COLUMN "pxlhutEmails",
ADD COLUMN     "invetrixaEmails" BOOLEAN NOT NULL DEFAULT true;
