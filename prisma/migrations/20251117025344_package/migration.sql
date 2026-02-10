/*
  Warnings:

  - The values [fixed,pay_per_use] on the enum `PackageType` will be removed. If these variants are still used in the database, this will fail.
  - Changed the type of `period` on the `Package` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Period" AS ENUM ('MONTHLY', 'YEARLY');

-- AlterEnum
BEGIN;
CREATE TYPE "PackageType_new" AS ENUM ('FIXED', 'PAY_PER_USE');
ALTER TABLE "Package" ALTER COLUMN "type" TYPE "PackageType_new" USING ("type"::text::"PackageType_new");
ALTER TYPE "PackageType" RENAME TO "PackageType_old";
ALTER TYPE "PackageType_new" RENAME TO "PackageType";
DROP TYPE "public"."PackageType_old";
COMMIT;

-- AlterTable
ALTER TABLE "Package" DROP COLUMN "period",
ADD COLUMN     "period" "Period" NOT NULL;
