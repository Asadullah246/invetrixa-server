-- AlterTable
ALTER TABLE "UserAssignment" ADD COLUMN     "assignedById" TEXT;

-- CreateIndex
CREATE INDEX "UserAssignment_assignedById_idx" ON "UserAssignment"("assignedById");

-- AddForeignKey
ALTER TABLE "UserAssignment" ADD CONSTRAINT "UserAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
