import { Prisma } from 'generated/prisma/client';

/**
 * Generate the next document number in sequence.
 * Format: {prefix}-{YEAR}-{XXXXX}
 * - QUOTE: QUO-2026-00001
 * - PROFORMA: PRO-2026-00001
 * - INVOICE: INV-2026-00001
 *
 * @param tenantId - Tenant ID for multi-tenancy
 * @param prefix - Document prefix (QUO, PRO, INV)
 * @param tx - Prisma transaction client to ensure sequential numbering
 * @returns Generated document number string
 */
export async function generateDocumentNumber(
  tenantId: string,
  prefix: 'QUO' | 'PRO' | 'INV',
  tx: Prisma.TransactionClient,
): Promise<string> {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;

  const latest = await tx.invoice.findFirst({
    where: {
      tenantId,
      documentNumber: { startsWith: fullPrefix },
    },
    orderBy: { documentNumber: 'desc' },
    select: { documentNumber: true },
  });

  const nextNumber = latest
    ? parseInt(latest.documentNumber.replace(fullPrefix, ''), 10) + 1
    : 1;

  return `${fullPrefix}${nextNumber.toString().padStart(5, '0')}`;
}
