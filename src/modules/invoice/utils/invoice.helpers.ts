import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, DocumentType, DocumentStatus } from 'generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { QueryInvoiceDto, CreateInvoiceItemDto } from '../dto';

// ==================== ENTITY VALIDATORS ====================

/**
 * Validates that customer exists and belongs to tenant
 */
export async function validateCustomer(
  prisma: PrismaService,
  tenantId: string,
  customerId: string,
): Promise<void> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: { id: true },
  });

  if (!customer) {
    throw new NotFoundException('Customer not found');
  }
}

/**
 * Validates that location exists and belongs to tenant
 */
export async function validateLocation(
  prisma: PrismaService,
  tenantId: string,
  locationId: string,
): Promise<void> {
  const location = await prisma.location.findFirst({
    where: { id: locationId, tenantId },
    select: { id: true },
  });

  if (!location) {
    throw new NotFoundException('Location not found');
  }
}

/**
 * Validates products and returns a map of product details
 */
export async function validateAndLoadProducts(
  prisma: PrismaService,
  tenantId: string,
  productIds: string[],
): Promise<Map<string, { id: string; name: string; sku: string | null }>> {
  const products = await prisma.product.findMany({
    where: { id: { in: productIds }, tenantId, deletedAt: null },
    select: { id: true, name: true, sku: true },
  });

  if (products.length !== productIds.length) {
    throw new BadRequestException('One or more products not found');
  }

  return new Map(products.map((p) => [p.id, p]));
}

// ==================== INVOICE HELPERS ====================

/**
 * Get document number prefix based on document type
 */
export function getDocumentPrefix(type: DocumentType): 'QUO' | 'PRO' | 'INV' {
  switch (type) {
    case DocumentType.QUOTE:
      return 'QUO';
    case DocumentType.PROFORMA:
      return 'PRO';
    case DocumentType.INVOICE:
      return 'INV';
  }
}

/**
 * Process invoice items and calculate line totals
 */
export function processInvoiceItems(
  items: CreateInvoiceItemDto[],
  productMap: Map<string, { id: string; name: string; sku: string | null }>,
): {
  processedItems: Array<{
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    taxAmount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    notes?: string;
    sortOrder: number;
  }>;
  subtotal: Prisma.Decimal;
} {
  let subtotal = new Prisma.Decimal(0);

  const processedItems = items.map((item, index) => {
    const product = productMap.get(item.productId)!;
    const unitPrice = new Prisma.Decimal(item.unitPrice);
    const quantity = item.quantity;
    const discountAmount = new Prisma.Decimal(item.discountAmount ?? 0);
    const taxAmount = new Prisma.Decimal(item.taxAmount ?? 0);
    const lineTotal = unitPrice
      .mul(quantity)
      .sub(discountAmount)
      .add(taxAmount);

    subtotal = subtotal.add(lineTotal);

    return {
      productId: item.productId,
      productName: product.name,
      productSku: product.sku ?? '',
      quantity,
      unitPrice,
      discountAmount,
      taxAmount,
      lineTotal,
      notes: item.notes,
      sortOrder: item.sortOrder ?? index,
    };
  });

  return { processedItems, subtotal };
}

/**
 * Build Prisma where filters from query DTO
 */
export function buildInvoiceFilters(
  query: QueryInvoiceDto,
): Prisma.InvoiceWhereInput {
  const filters: Prisma.InvoiceWhereInput = {};

  if (query.documentType) {
    filters.documentType = query.documentType;
  }

  if (query.status) {
    filters.status = query.status;
  }

  if (query.customerId) {
    filters.customerId = query.customerId;
  }

  if (query.locationId) {
    filters.locationId = query.locationId;
  }

  if (query.dateFrom || query.dateTo) {
    filters.issueDate = {};
    if (query.dateFrom) {
      filters.issueDate.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      filters.issueDate.lte = new Date(query.dateTo);
    }
  }

  if (query.search) {
    filters.OR = [
      { documentNumber: { contains: query.search, mode: 'insensitive' } },
      { subject: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return filters;
}

// ==================== STATUS VALIDATORS ====================

/**
 * Validates that invoice can be updated (must be DRAFT)
 */
export function validateCanUpdate(status: DocumentStatus): void {
  if (status !== DocumentStatus.DRAFT) {
    throw new BadRequestException('Only draft invoices can be updated');
  }
}

/**
 * Validates that invoice can be sent (must be DRAFT)
 */
export function validateCanSend(status: DocumentStatus): void {
  if (status !== DocumentStatus.DRAFT) {
    throw new BadRequestException('Only draft invoices can be sent');
  }
}

/**
 * Validates that quote can be converted (must be DRAFT or SENT)
 */
export function validateCanConvert(
  documentType: DocumentType,
  status: DocumentStatus,
): void {
  if (documentType !== DocumentType.QUOTE) {
    throw new BadRequestException('Only quotes can be converted to invoices');
  }

  if (status !== DocumentStatus.DRAFT && status !== DocumentStatus.SENT) {
    throw new BadRequestException('Only draft or sent quotes can be converted');
  }
}

/**
 * Validates that invoice can receive payments (must not be QUOTE)
 */
export function validateCanReceivePayment(documentType: DocumentType): void {
  if (documentType === DocumentType.QUOTE) {
    throw new BadRequestException('Cannot record payments against quotes');
  }
}

/**
 * Validates that invoice can be cancelled
 */
export function validateCanCancel(status: DocumentStatus): void {
  if (status === DocumentStatus.PAID || status === DocumentStatus.CANCELLED) {
    throw new BadRequestException('Cannot cancel this invoice');
  }
}
