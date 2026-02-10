import { Prisma } from 'generated/prisma/client';

/**
 * Generate the next sale number in sequence.
 * Format: INV-{YEAR}-{XXXXX} (e.g., INV-2026-00001)
 *
 * @param tenantId - Tenant ID for multi-tenancy
 * @param tx - Prisma transaction client to ensure sequential numbering
 * @returns Generated sale number string
 */
export async function generateSaleNumber(
  tenantId: string,
  tx: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;

  const latest = await tx.sale.findFirst({
    where: {
      tenantId,
      saleNumber: { startsWith: prefix },
    },
    orderBy: { saleNumber: 'desc' },
    select: { saleNumber: true },
  });

  const nextNumber = latest
    ? parseInt(latest.saleNumber.replace(prefix, ''), 10) + 1
    : 1;

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}
