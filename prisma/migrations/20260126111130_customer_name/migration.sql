/*
  Warnings:

  - Made the column `firstName` on table `customers` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" DROP NOT NULL;
