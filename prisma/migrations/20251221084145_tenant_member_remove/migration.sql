-- CreateTable
CREATE TABLE "tenant_member_removals" (
    "id" TEXT NOT NULL,
    "reason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "removedById" TEXT NOT NULL,

    CONSTRAINT "tenant_member_removals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_member_removals_userId_idx" ON "tenant_member_removals"("userId");

-- CreateIndex
CREATE INDEX "tenant_member_removals_tenantId_idx" ON "tenant_member_removals"("tenantId");

-- CreateIndex
CREATE INDEX "tenant_member_removals_removedById_idx" ON "tenant_member_removals"("removedById");

-- AddForeignKey
ALTER TABLE "tenant_member_removals" ADD CONSTRAINT "tenant_member_removals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_member_removals" ADD CONSTRAINT "tenant_member_removals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_member_removals" ADD CONSTRAINT "tenant_member_removals_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
