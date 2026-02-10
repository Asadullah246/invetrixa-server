



-- 1️⃣ Add the column (nullable first)
ALTER TABLE "addresses" ADD COLUMN "locationId" TEXT;

-- 2️⃣ Populate locationId from existing relationship
-- (This depends on how the relationship currently exists)
-- UPDATE "addresses" SET "locationId" = ... 

-- 3️⃣ Remove duplicates (if any exist after population)
DELETE FROM "addresses" a
USING "addresses" b
WHERE a."locationId" = b."locationId"
  AND a."locationId" IS NOT NULL
  AND a."createdAt" < b."createdAt";

-- 4️⃣ Add UNIQUE constraint
CREATE UNIQUE INDEX "addresses_locationId_key" ON "addresses"("locationId");

-- 5️⃣ Add foreign key constraint
ALTER TABLE "addresses"
ADD CONSTRAINT "addresses_locationId_fkey"
FOREIGN KEY ("locationId") REFERENCES "locations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;












-- /*
--   Warnings:

--   - A unique constraint covering the columns `[locationId]` on the table `addresses` will be added. If there are existing duplicate values, this will fail.

-- */
-- -- AlterTable
-- ALTER TABLE "addresses" ADD COLUMN     "locationId" TEXT;

-- -- CreateIndex
-- CREATE UNIQUE INDEX "addresses_locationId_key" ON "addresses"("locationId");

-- -- AddForeignKey
-- ALTER TABLE "addresses" ADD CONSTRAINT "addresses_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
