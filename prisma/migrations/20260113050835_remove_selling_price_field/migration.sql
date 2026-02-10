/*
  Warnings:

  - You are about to drop the column `sellingPrice` on the `products` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "products" DROP COLUMN "sellingPrice",
ALTER COLUMN "markupValue" SET DATA TYPE DECIMAL(15,4);
