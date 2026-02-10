import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, DocumentType, DocumentStatus } from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  QueryInvoiceDto,
  CreateInvoicePaymentDto,
  InvoiceDetailResponseDto,
} from '../dto';
import {
  generateDocumentNumber,
  formatListResponse,
  formatDetailResponse,
  InvoiceWithIncludes,
  InvoiceListItem,
  getDocumentPrefix,
  processInvoiceItems,
  buildInvoiceFilters,
  validateCustomer,
  validateLocation,
  validateAndLoadProducts,
  validateCanUpdate,
  validateCanSend,
  validateCanConvert,
  validateCanReceivePayment,
  validateCanCancel,
} from '../utils';

// ==================== CONSTANTS ====================

const INCLUDE_DETAIL_RELATIONS = {
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: { sortOrder: 'asc' as const },
  },
  payments: { orderBy: { paymentDate: 'asc' as const } },
  customer: true,
  location: { select: { id: true, name: true } },
};

const INCLUDE_LIST_RELATIONS = {
  customer: { select: { firstName: true, lastName: true, companyName: true } },
  location: { select: { name: true } },
  _count: { select: { items: true } },
};

// ==================== SERVICE ====================

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== CREATE ====================

  async create(
    tenantId: string,
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    // Validate entities
    await validateCustomer(this.prisma, tenantId, dto.customerId);
    await validateLocation(this.prisma, tenantId, dto.locationId);

    const productIds = dto.items.map((item) => item.productId);
    const productMap = await validateAndLoadProducts(
      this.prisma,
      tenantId,
      productIds,
    );

    // Process items and calculate totals
    const { processedItems, subtotal } = processInvoiceItems(
      dto.items,
      productMap,
    );
    const discountAmount = new Prisma.Decimal(dto.discountAmount ?? 0);
    const taxAmount = new Prisma.Decimal(0);
    const totalAmount = subtotal.sub(discountAmount).add(taxAmount);

    // Create invoice in transaction
    const invoice = await this.prisma.$transaction(async (tx) => {
      const prefix = getDocumentPrefix(dto.documentType);
      const documentNumber = await generateDocumentNumber(tenantId, prefix, tx);

      const newInvoice = await tx.invoice.create({
        data: {
          documentNumber,
          documentType: dto.documentType,
          status: DocumentStatus.DRAFT,
          subject: dto.subject,
          subtotal,
          discountAmount,
          taxAmount,
          totalAmount,
          paidAmount: 0,
          dueAmount: totalAmount,
          issueDate: new Date(),
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          paymentTerms: dto.paymentTerms,
          notes: dto.notes,
          customerNotes: dto.customerNotes,
          termsConditions: dto.termsConditions,
          customerId: dto.customerId,
          locationId: dto.locationId,
          tenantId,
          createdById: userId,
        },
      });

      await tx.invoiceItem.createMany({
        data: processedItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
          notes: item.notes,
          sortOrder: item.sortOrder,
          invoiceId: newInvoice.id,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: newInvoice.id },
        include: INCLUDE_DETAIL_RELATIONS,
      });
    });

    if (!invoice) {
      throw new BadRequestException('Failed to create invoice');
    }

    const typeLabel =
      dto.documentType === DocumentType.QUOTE ? 'Quote' : 'Invoice';

    return {
      message: `${typeLabel} created successfully`,
      data: formatDetailResponse(invoice as InvoiceWithIncludes),
    };
  }

  // ==================== READ ====================

  async findAll(
    tenantId: string,
    query: QueryInvoiceDto,
  ): Promise<{
    data: ReturnType<typeof formatListResponse>[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData } = getPagination(query);
    const filters = buildInvoiceFilters(query);

    const where: Prisma.InvoiceWhereInput = { tenantId, ...filters };

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        ...paginationPrismaQuery,
        include: INCLUDE_LIST_RELATIONS,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: (data as unknown as InvoiceListItem[]).map(formatListResponse),
      meta: generatePaginationMeta({
        page: paginationData.page,
        limit: paginationData.limit,
        total,
        skip: paginationData.skip,
      }),
    };
  }

  async findOne(
    tenantId: string,
    id: string,
  ): Promise<InvoiceDetailResponseDto> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: INCLUDE_DETAIL_RELATIONS,
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return formatDetailResponse(invoice as InvoiceWithIncludes);
  }

  // ==================== UPDATE ====================

  async update(
    tenantId: string,
    id: string,
    dto: UpdateInvoiceDto,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    const invoice = await this.findInvoiceOrThrow(tenantId, id);
    validateCanUpdate(invoice.status);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        subject: dto.subject,
        discountAmount: dto.discountAmount,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        paymentTerms: dto.paymentTerms,
        notes: dto.notes,
        customerNotes: dto.customerNotes,
        termsConditions: dto.termsConditions,
      },
      include: INCLUDE_DETAIL_RELATIONS,
    });

    return {
      message: 'Invoice updated successfully',
      data: formatDetailResponse(updated as InvoiceWithIncludes),
    };
  }

  // ==================== STATUS TRANSITIONS ====================

  async markAsSent(
    tenantId: string,
    id: string,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    const invoice = await this.findInvoiceOrThrow(tenantId, id);
    validateCanSend(invoice.status);

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: DocumentStatus.SENT,
        sentAt: new Date(),
      },
      include: INCLUDE_DETAIL_RELATIONS,
    });

    return {
      message: 'Invoice marked as sent',
      data: formatDetailResponse(updated as InvoiceWithIncludes),
    };
  }

  async convertToInvoice(
    tenantId: string,
    userId: string,
    quoteId: string,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    const quote = await this.prisma.invoice.findFirst({
      where: { id: quoteId, tenantId },
      include: {
        items: true,
        customer: true,
        location: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    validateCanConvert(quote.documentType, quote.status);

    const invoice = await this.prisma.$transaction(async (tx) => {
      // Mark quote as accepted
      await tx.invoice.update({
        where: { id: quoteId },
        data: {
          status: DocumentStatus.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      // Generate invoice number
      const documentNumber = await generateDocumentNumber(tenantId, 'INV', tx);

      // Create new invoice from quote
      const newInvoice = await tx.invoice.create({
        data: {
          documentNumber,
          documentType: DocumentType.INVOICE,
          status: DocumentStatus.DRAFT,
          subject: quote.subject,
          subtotal: quote.subtotal,
          discountAmount: quote.discountAmount,
          taxAmount: quote.taxAmount,
          totalAmount: quote.totalAmount,
          paidAmount: 0,
          dueAmount: quote.totalAmount,
          issueDate: new Date(),
          dueDate: quote.dueDate,
          paymentTerms: quote.paymentTerms,
          notes: quote.notes,
          customerNotes: quote.customerNotes,
          termsConditions: quote.termsConditions,
          sourceDocumentId: quoteId,
          customerId: quote.customerId,
          locationId: quote.locationId,
          tenantId,
          createdById: userId,
        },
      });

      // Copy items
      await tx.invoiceItem.createMany({
        data: quote.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productSku: item.productSku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          taxAmount: item.taxAmount,
          lineTotal: item.lineTotal,
          notes: item.notes,
          sortOrder: item.sortOrder,
          invoiceId: newInvoice.id,
        })),
      });

      return tx.invoice.findUnique({
        where: { id: newInvoice.id },
        include: INCLUDE_DETAIL_RELATIONS,
      });
    });

    if (!invoice) {
      throw new BadRequestException('Failed to create invoice from quote');
    }

    return {
      message: 'Quote converted to invoice successfully',
      data: formatDetailResponse(invoice as InvoiceWithIncludes),
    };
  }

  async recordPayment(
    tenantId: string,
    userId: string,
    invoiceId: string,
    dto: CreateInvoicePaymentDto,
  ): Promise<{ message: string; data: InvoiceDetailResponseDto }> {
    const invoice = await this.findInvoiceOrThrow(tenantId, invoiceId);
    validateCanReceivePayment(invoice.documentType);

    const paymentAmount = new Prisma.Decimal(dto.amount);
    const newPaidAmount = invoice.paidAmount.add(paymentAmount);
    const newDueAmount = invoice.totalAmount.sub(newPaidAmount);

    // Determine new status
    let newStatus = invoice.status;
    if (newDueAmount.lte(0)) {
      newStatus = DocumentStatus.PAID;
    } else if (newPaidAmount.gt(0)) {
      newStatus = DocumentStatus.PARTIALLY_PAID;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.invoicePayment.create({
        data: {
          amount: paymentAmount,
          paymentMethod: dto.method,
          transactionRef: dto.transactionRef,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          notes: dto.notes,
          invoiceId,
          processedById: userId,
        },
      });

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount.lt(0) ? 0 : newDueAmount,
          status: newStatus,
          paidAt: newStatus === DocumentStatus.PAID ? new Date() : undefined,
        },
        include: INCLUDE_DETAIL_RELATIONS,
      });
    });

    return {
      message: 'Payment recorded successfully',
      data: formatDetailResponse(updated as InvoiceWithIncludes),
    };
  }

  async cancel(tenantId: string, id: string): Promise<{ message: string }> {
    const invoice = await this.findInvoiceOrThrow(tenantId, id);
    validateCanCancel(invoice.status);

    await this.prisma.invoice.update({
      where: { id },
      data: {
        status: DocumentStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    return { message: 'Invoice cancelled successfully' };
  }

  // ==================== PRIVATE HELPERS ====================

  private async findInvoiceOrThrow(tenantId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }
}
