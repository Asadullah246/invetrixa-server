/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phone]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `email` to the `locations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `locations` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add columns as nullable
ALTER TABLE "locations" ADD COLUMN "email" VARCHAR(255);
ALTER TABLE "locations" ADD COLUMN "phone" VARCHAR(20);

-- Step 2: Backfill with guaranteed-unique values
UPDATE "locations"
SET 
  email = 'location_' || id::text || '@placeholder.com',
  phone = '+8801' || LPAD(id::text, 9, '0');

-- Step 3: Enforce NOT NULL
ALTER TABLE "locations" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "locations" ALTER COLUMN "phone" SET NOT NULL;

-- Step 4: Add constraints & indexes
CREATE UNIQUE INDEX "locations_email_key" ON "locations"("email");
CREATE UNIQUE INDEX "locations_phone_key" ON "locations"("phone");

CREATE INDEX "locations_email_idx" ON "locations"("email");
CREATE INDEX "locations_phone_idx" ON "locations"("phone");
