-- DropIndex
DROP INDEX "attributes_name_tenantId_key";

-- DropIndex
DROP INDEX "product_categories_slug_tenantId_key";

-- DropIndex
DROP INDEX "products_sku_tenantId_key";

-- DropIndex
DROP INDEX "products_slug_tenantId_key";

-- DropIndex
DROP INDEX "suppliers_name_tenantId_key";

-- CreateIndex
CREATE INDEX "attributes_name_tenantId_idx" ON "attributes"("name", "tenantId");

-- CreateIndex
CREATE INDEX "product_categories_slug_tenantId_idx" ON "product_categories"("slug", "tenantId");

-- CreateIndex
CREATE INDEX "products_sku_tenantId_idx" ON "products"("sku", "tenantId");

-- CreateIndex
CREATE INDEX "products_slug_tenantId_idx" ON "products"("slug", "tenantId");

-- CreateIndex
CREATE INDEX "suppliers_name_tenantId_idx" ON "suppliers"("name", "tenantId");
