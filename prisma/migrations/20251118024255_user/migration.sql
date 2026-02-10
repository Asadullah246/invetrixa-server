/*
  Warnings:

  - You are about to drop the column `overtimeAlerts` on the `user_preferences` table. All the data in the column will be lost.
  - The `theme` column on the `user_preferences` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `businessType` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('RETAIL', 'ECOMMERCE', 'WHOLESALE', 'DISTRIBUTION', 'MANUFACTURING', 'SERVICES', 'PROFESSIONAL_SERVICES', 'IT_SERVICES', 'HOSPITALITY', 'FOOD', 'HEALTHCARE', 'FITNESS', 'EDUCATION', 'CONSTRUCTION', 'REAL_ESTATE', 'FINANCE', 'LOGISTICS', 'TRANSPORT', 'AGRICULTURE', 'NON_PROFIT', 'MEDIA', 'ENTERTAINMENT', 'GOVERNMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');

-- AlterTable
ALTER TABLE "user_preferences" DROP COLUMN "overtimeAlerts",
ADD COLUMN     "pxlhutEmails" BOOLEAN NOT NULL DEFAULT true,
DROP COLUMN "theme",
ADD COLUMN     "theme" "Theme" NOT NULL DEFAULT 'LIGHT';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "businessType",
ADD COLUMN     "businessType" "BusinessType"[];

-- CreateTable
CREATE TABLE "OnboardingState" (
    "id" TEXT NOT NULL,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "tenantCreation" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,

    CONSTRAINT "OnboardingState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OnboardingState_userId_key" ON "OnboardingState"("userId");

-- AddForeignKey
ALTER TABLE "OnboardingState" ADD CONSTRAINT "OnboardingState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
