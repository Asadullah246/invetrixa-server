import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  Prisma,
  SaleStatus,
  PaymentStatus,
  StockMovementType,
  StockReferenceType,
  ReservationStatus,
  Product,
} from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import {
  CreateSaleDto,
  CreateSaleItemDto,
  CreatePaymentDto,
  CompleteSaleDto,
  QuerySaleDto,
  SaleResponseDto,
  SaleDetailResponseDto,
  SaleItemResponseDto,
  SalePaymentResponseDto,
} from '../dto';
import { MovementService, BulkStockOutItemDto } from '@/modules/stock';
import { PaymentService } from './payment.service';
import { PosQueueService } from '../queue';
import { generateSaleNumber } from '../utils';

// ==================== TYPE DEFINITIONS ====================

/** Product fields needed for sale item processing */
type ProductForSale = Pick<
  Product,
  'id' | 'name' | 'sku' | 'minSellingPrice' | 'maxSellingPrice'
>;

/** Processed sale item ready for database insertion */
interface ProcessedSaleItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
  notes?: string;
}

/** Calculated sale totals */
interface SaleTotals {
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  changeAmount: Prisma.Decimal;
}

/** Context for creating a sale */
interface CreateSaleContext {
  tenantId: string;
  userId: string;
  locationId: string;
  products: Map<string, ProductForSale>;
  productCosts: Map<string, Prisma.Decimal>;
}

/** Sale with full relations for responses */
type SaleWithIncludes = Prisma.SaleGetPayload<{
  include: {
    location: { select: { id: true; name: true } };
    customer: {
      select: { id: true; firstName: true; lastName: true; phone: true };
    };
    cashier: { select: { id: true; firstName: true; lastName: true } };
    items: {
      include: {
        product: { select: { id: true; name: true; sku: true } };
      };
    };
    payments: true;
  };
}>;

/** Sale for list view with counts */
type SaleForList = Prisma.SaleGetPayload<{
  include: {
    location: { select: { id: true; name: true } };
    customer: { select: { id: true; firstName: true; lastName: true } };
    cashier: { select: { id: true; firstName: true; lastName: true } };
    _count: { select: { items: true } };
  };
}>;

// ==================== SERVICE ====================

@Injectable()
export class SaleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly movementService: MovementService,
    private readonly paymentService: PaymentService,
    private readonly queueService: PosQueueService,
  ) {}

  /** Standard relations for detailed sale queries */
  private readonly includeRelations = {
    location: { select: { id: true, name: true } },
    customer: {
      select: { id: true, firstName: true, lastName: true, phone: true },
    },
    cashier: { select: { id: true, firstName: true, lastName: true } },
    items: {
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    },
    payments: true,
  } as const;

  // ==================== PUBLIC METHODS ====================

  /**
   * Create a new sale with items and payments (Quick Sale)
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateSaleDto,
  ): Promise<{ message: string; data: SaleDetailResponseDto }> {
    // Validate inputs
    await this.validateLocation(tenantId, dto.locationId);
    this.validateItems(dto.items);
    this.validatePayments(dto.payments);

    // Load product data
    const products = await this.loadProducts(tenantId, dto.items);
    const productCosts = await this.loadProductCosts(dto.locationId, dto.items);

    // Build context for processing
    const context: CreateSaleContext = {
      tenantId,
      userId,
      locationId: dto.locationId,
      products,
      productCosts,
    };

    // Validate stock availability
    await this.validateStockAvailability(context, dto.items);

    // Process items and calculate totals
    const processedItems = this.processItems(context, dto.items);
    const totals = this.calculateTotals(
      processedItems,
      dto.discountAmount,
      dto.payments,
    );

    // Validate payment covers total
    this.validatePaymentAmount(totals.totalAmount, totals.paidAmount);

    // Execute sale creation in transaction
    const sale = await this.executeSaleTransaction(
      context,
      dto,
      processedItems,
      totals,
    );

    // Dispatch background job for daily summary (same as complete())
    await this.queueService.dispatchUpdateDailySales(
      tenantId,
      dto.locationId,
      sale.createdAt,
    );

    return {
      message: 'Sale completed successfully',
      data: this.formatDetailResponse(sale),
    };
  }

  /**
   * Complete a draft sale (Cart) with payment
   */
  async complete(
    tenantId: string,
    userId: string,
    saleId: string,
    dto: CompleteSaleDto,
  ): Promise<{ message: string; data: SaleDetailResponseDto }> {
    const sale = await this.findDraftSale(tenantId, saleId);

    // Calculate totals from existing items
    const { subtotal, stockOutItems } = this.aggregateSaleItems(sale.items);
    const totals = this.calculateCompletionTotals(sale, subtotal, dto.payments);

    // Validate payment
    this.validatePaymentAmount(totals.totalAmount, totals.paidAmount);

    // Execute completion in transaction
    const updatedSale = await this.executeCompletionTransaction(
      tenantId,
      userId,
      sale,
      dto,
      stockOutItems,
      totals,
    );

    // Dispatch background job for daily summary
    await this.queueService.dispatchUpdateDailySales(
      tenantId,
      updatedSale.locationId,
      updatedSale.createdAt,
    );

    return {
      message: 'Sale completed successfully',
      data: this.formatDetailResponse(updatedSale),
    };
  }

  /**
   * Get all sales with pagination and filters
   */
  async findAll(
    tenantId: string,
    query: QuerySaleDto,
  ): Promise<{
    data: SaleResponseDto[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);
    const where = this.buildFilter(tenantId, filterParams);

    const [data, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        ...paginationPrismaQuery,
        orderBy: { createdAt: 'desc' },
        include: {
          location: { select: { id: true, name: true } },
          customer: { select: { id: true, firstName: true, lastName: true } },
          cashier: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({ ...paginationData, total }),
      data: data.map((s) => this.formatListResponse(s)),
    };
  }

  /**
   * Get a single sale by ID
   */
  async findOne(tenantId: string, id: string): Promise<SaleDetailResponseDto> {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: this.includeRelations,
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return this.formatDetailResponse(sale);
  }

  /**
   * Void a sale (cancel with stock reversal)
   */
  async void(
    tenantId: string,
    userId: string,
    saleId: string,
    reason: string,
  ): Promise<{ message: string }> {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException(`Cannot void ${sale.status} sale`);
    }

    await this.executeVoidTransaction(tenantId, userId, sale, reason);

    return { message: 'Sale voided successfully' };
  }

  // ==================== VALIDATION HELPERS ====================

  private async validateLocation(
    tenantId: string,
    locationId: string,
  ): Promise<void> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
      select: { id: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }
  }

  private validateItems(items: CreateSaleItemDto[]): void {
    if (!items?.length) {
      throw new BadRequestException('At least one item is required');
    }
  }

  private validatePayments(payments: CreatePaymentDto[]): void {
    if (!payments?.length) {
      throw new BadRequestException('At least one payment is required');
    }
  }

  private validatePaymentAmount(
    totalAmount: Prisma.Decimal,
    paidAmount: Prisma.Decimal,
  ): void {
    if (paidAmount.lessThan(totalAmount)) {
      throw new BadRequestException(
        `Insufficient payment. Total: ${totalAmount.toFixed(2)}, Paid: ${paidAmount.toFixed(2)}`,
      );
    }
  }

  private async validateStockAvailability(
    context: CreateSaleContext,
    items: CreateSaleItemDto[],
  ): Promise<void> {
    for (const item of items) {
      const balance = await this.prisma.inventoryBalance.findFirst({
        where: {
          productId: item.productId,
          locationId: context.locationId,
          tenantId: context.tenantId,
        },
        select: { onHandQuantity: true, reservedQuantity: true },
      });

      const available =
        (balance?.onHandQuantity ?? 0) - (balance?.reservedQuantity ?? 0);

      if (available < item.quantity) {
        const product = context.products.get(item.productId);
        throw new BadRequestException(
          `Insufficient stock for "${product?.name}". Available: ${available}, Requested: ${item.quantity}`,
        );
      }
    }
  }

  // ==================== DATA LOADING HELPERS ====================

  private async loadProducts(
    tenantId: string,
    items: CreateSaleItemDto[],
  ): Promise<Map<string, ProductForSale>> {
    const productIds = items.map((item) => item.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId },
      select: {
        id: true,
        name: true,
        sku: true,
        minSellingPrice: true,
        maxSellingPrice: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all products exist
    for (const item of items) {
      if (!productMap.has(item.productId)) {
        throw new NotFoundException(`Product ${item.productId} not found`);
      }
    }

    return productMap;
  }

  private async loadProductCosts(
    locationId: string,
    items: CreateSaleItemDto[],
  ): Promise<Map<string, Prisma.Decimal>> {
    const costs = new Map<string, Prisma.Decimal>();

    for (const item of items) {
      const layer = await this.prisma.valuationLayer.findFirst({
        where: {
          productId: item.productId,
          locationId,
          remainingQty: { gt: 0 },
        },
        orderBy: { createdAt: 'asc' }, // FIFO
        select: { unitCost: true },
      });

      costs.set(item.productId, layer?.unitCost ?? new Prisma.Decimal(0));
    }

    return costs;
  }

  private async findDraftSale(tenantId: string, saleId: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id: saleId, tenantId },
      include: { items: true },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    if (sale.status !== SaleStatus.DRAFT) {
      throw new BadRequestException(`Sale is already ${sale.status}`);
    }

    if (!sale.items.length) {
      throw new BadRequestException('Cannot complete empty sale');
    }

    return sale;
  }

  // ==================== PROCESSING HELPERS ====================

  private processItems(
    context: CreateSaleContext,
    items: CreateSaleItemDto[],
  ): ProcessedSaleItem[] {
    return items.map((item) => {
      const product = context.products.get(item.productId)!;
      const unitCost =
        context.productCosts.get(item.productId) ?? new Prisma.Decimal(0);

      const unitPrice = item.unitPrice
        ? new Prisma.Decimal(item.unitPrice)
        : (product.minSellingPrice ?? new Prisma.Decimal(0));

      const discountAmount = new Prisma.Decimal(item.discountAmount ?? 0);
      const quantity = Math.floor(item.quantity);
      const lineTotal = unitPrice
        .mul(quantity)
        .sub(discountAmount.mul(quantity));

      return {
        productId: item.productId,
        productName: product.name,
        productSku: product.sku,
        quantity,
        unitPrice,
        unitCost,
        discountAmount,
        lineTotal,
        notes: item.notes,
      };
    });
  }

  private calculateTotals(
    items: ProcessedSaleItem[],
    overallDiscountAmount?: number,
    payments?: CreatePaymentDto[],
  ): SaleTotals {
    const subtotal = items.reduce(
      (sum, item) => sum.add(item.lineTotal),
      new Prisma.Decimal(0),
    );

    const discountAmount = new Prisma.Decimal(overallDiscountAmount ?? 0);
    const taxAmount = new Prisma.Decimal(0); // Future: implement tax calculation
    const totalAmount = subtotal.sub(discountAmount).add(taxAmount);

    const paidAmount = (payments ?? []).reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );

    const changeAmount = paidAmount.sub(totalAmount);

    return {
      subtotal,
      discountAmount,
      taxAmount,
      totalAmount,
      paidAmount,
      changeAmount,
    };
  }

  private aggregateSaleItems(
    items: { productId: string; quantity: number; lineTotal: Prisma.Decimal }[],
  ): { subtotal: Prisma.Decimal; stockOutItems: BulkStockOutItemDto[] } {
    let subtotal = new Prisma.Decimal(0);
    const stockOutItems: BulkStockOutItemDto[] = [];

    for (const item of items) {
      subtotal = subtotal.add(item.lineTotal);
      stockOutItems.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    return { subtotal, stockOutItems };
  }

  private calculateCompletionTotals(
    sale: { discountAmount: Prisma.Decimal; taxAmount: Prisma.Decimal },
    subtotal: Prisma.Decimal,
    payments?: CreatePaymentDto[],
  ): SaleTotals {
    const totalAmount = subtotal.sub(sale.discountAmount).add(sale.taxAmount);

    const paidAmount = (payments ?? []).reduce(
      (sum, p) => sum.add(new Prisma.Decimal(p.amount)),
      new Prisma.Decimal(0),
    );

    const changeAmount = this.paymentService.calculateChange(
      totalAmount,
      paidAmount,
    );

    return {
      subtotal,
      discountAmount: sale.discountAmount,
      taxAmount: sale.taxAmount,
      totalAmount,
      paidAmount,
      changeAmount,
    };
  }

  // ==================== TRANSACTION HELPERS ====================

  private async executeSaleTransaction(
    context: CreateSaleContext,
    dto: CreateSaleDto,
    items: ProcessedSaleItem[],
    totals: SaleTotals,
  ): Promise<SaleWithIncludes> {
    const sale = await this.prisma.$transaction(async (tx) => {
      // Generate sale number using shared utility
      const saleNumber = await generateSaleNumber(context.tenantId, tx);

      // Create sale record
      const newSale = await tx.sale.create({
        data: {
          saleNumber,
          status: SaleStatus.COMPLETED,
          ...totals,
          completedAt: new Date(),
          notes: dto.notes,
          locationId: dto.locationId,
          terminalId: dto.terminalId,
          customerId: dto.customerId,
          sessionId: dto.sessionId,
          cashierId: context.userId,
          tenantId: context.tenantId,
        },
      });

      // Create sale items
      await tx.saleItem.createMany({
        data: items.map((item) => ({
          ...item,
          saleId: newSale.id,
        })),
      });

      // Create payments
      await tx.salePayment.createMany({
        data: dto.payments.map((payment) => ({
          method: payment.method,
          amount: new Prisma.Decimal(payment.amount),
          status: PaymentStatus.COMPLETED,
          transactionRef: payment.transactionRef,
          notes: payment.notes,
          saleId: newSale.id,
          processedById: context.userId,
        })),
      });

      // Process stock out
      await this.movementService.stockOut(
        context.tenantId,
        context.userId,
        {
          locationId: dto.locationId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          referenceType: StockReferenceType.SALE,
          referenceId: newSale.id,
          note: 'POS Sale',
        },
        tx,
      );

      // Return with relations
      return tx.sale.findUnique({
        where: { id: newSale.id },
        include: this.includeRelations,
      });
    });

    if (!sale) {
      throw new BadRequestException('Failed to create sale');
    }

    return sale;
  }

  private async executeCompletionTransaction(
    tenantId: string,
    userId: string,
    sale: { id: string; locationId: string; notes: string | null },
    dto: CompleteSaleDto,
    stockOutItems: BulkStockOutItemDto[],
    totals: SaleTotals,
  ): Promise<SaleWithIncludes> {
    return this.prisma.$transaction(async (tx) => {
      // Process payments
      await this.paymentService.processPayments(
        tx,
        sale.id,
        dto.payments,
        userId,
      );

      // Process stock out
      await this.movementService.stockOut(
        tenantId,
        userId,
        {
          locationId: sale.locationId,
          items: stockOutItems,
          referenceType: StockReferenceType.SALE,
          referenceId: sale.id,
          note: dto.notes ?? 'POS Sale',
        },
        tx,
      );

      // Mark reservations as fulfilled (cart items were reserved during add)
      await tx.stockReservation.updateMany({
        where: {
          referenceId: sale.id,
          referenceType: 'SALE',
          status: ReservationStatus.ACTIVE,
        },
        data: {
          status: ReservationStatus.FULFILLED,
        },
      });

      // Update sale status
      return tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.COMPLETED,
          paidAmount: totals.paidAmount,
          changeAmount: totals.changeAmount,
          completedAt: new Date(),
          notes: dto.notes ?? sale.notes,
          cashierId: userId,
        },
        include: this.includeRelations,
      });
    });
  }

  private async executeVoidTransaction(
    tenantId: string,
    userId: string,
    sale: {
      id: string;
      locationId: string;
      items: {
        productId: string;
        quantity: number;
        unitCost: Prisma.Decimal;
      }[];
    },
    reason: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Update sale status
      await tx.sale.update({
        where: { id: sale.id },
        data: {
          status: SaleStatus.VOIDED,
          voidedAt: new Date(),
          voidedById: userId,
          voidReason: reason,
        },
      });

      // Reverse stock movements
      for (const item of sale.items) {
        await tx.stockMovement.create({
          data: {
            movementType: StockMovementType.IN,
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.unitCost.mul(item.quantity),
            referenceType: StockReferenceType.SALE,
            referenceId: sale.id,
            productId: item.productId,
            locationId: sale.locationId,
            createdById: userId,
            tenantId,
            note: `Void reversal: ${reason}`,
          },
        });

        // Restore inventory
        await tx.inventoryBalance.updateMany({
          where: {
            productId: item.productId,
            locationId: sale.locationId,
            tenantId,
          },
          data: {
            onHandQuantity: { increment: item.quantity },
          },
        });
      }
    });
  }

  // generateSaleNumber moved to ../utils/sale-number.generator.ts

  // ==================== FILTER BUILDER ====================

  private buildFilter(
    tenantId: string,
    params: Partial<QuerySaleDto>,
  ): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = { tenantId };

    if (params.locationId) where.locationId = params.locationId;
    if (params.terminalId) where.terminalId = params.terminalId;
    if (params.sessionId) where.sessionId = params.sessionId;
    if (params.customerId) where.customerId = params.customerId;
    if (params.status) where.status = params.status;

    if (params.search) {
      where.saleNumber = { contains: params.search, mode: 'insensitive' };
    }

    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
      if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
    }

    return where;
  }

  // ==================== RESPONSE FORMATTERS ====================

  private formatListResponse(sale: SaleForList): SaleResponseDto {
    return {
      id: sale.id,
      invoiceNumber: sale.saleNumber,
      status: sale.status,
      subtotal: sale.subtotal.toFixed(4),
      discountAmount: sale.discountAmount.toFixed(4),
      taxAmount: sale.taxAmount.toFixed(4),
      totalAmount: sale.totalAmount.toFixed(4),
      paidAmount: sale.paidAmount.toFixed(4),
      changeAmount: sale.changeAmount.toFixed(4),
      createdAt: sale.createdAt,
      locationName: sale.location.name,
      customerName: sale.customer
        ? `${sale.customer.firstName} ${sale.customer.lastName ?? ''}`.trim()
        : null,
      cashierName: `${sale.cashier.firstName} ${sale.cashier.lastName}`,
      itemCount: sale._count.items,
    };
  }

  private formatDetailResponse(sale: SaleWithIncludes): SaleDetailResponseDto {
    return {
      id: sale.id,
      invoiceNumber: sale.saleNumber,
      status: sale.status,
      subtotal: sale.subtotal.toFixed(4),
      discountAmount: sale.discountAmount.toFixed(4),
      taxAmount: sale.taxAmount.toFixed(4),
      totalAmount: sale.totalAmount.toFixed(4),
      paidAmount: sale.paidAmount.toFixed(4),
      changeAmount: sale.changeAmount.toFixed(4),
      notes: sale.notes,
      createdAt: sale.createdAt,
      location: {
        id: sale.location.id,
        name: sale.location.name,
      },
      customer: sale.customer
        ? {
            id: sale.customer.id,
            name: `${sale.customer.firstName} ${sale.customer.lastName ?? ''}`.trim(),
            phone: sale.customer.phone,
          }
        : null,
      cashier: {
        id: sale.cashier.id,
        name: `${sale.cashier.firstName} ${sale.cashier.lastName}`,
      },
      items: sale.items.map((item) => this.formatItemResponse(item)),
      payments: sale.payments.map((p) => this.formatPaymentResponse(p)),
    };
  }

  private formatItemResponse(item: {
    id: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    discountAmount: Prisma.Decimal;
    lineTotal: Prisma.Decimal;
    notes: string | null;
    product: { id: string; name: string; sku: string };
  }): SaleItemResponseDto {
    return {
      id: item.id,
      product: {
        id: item.product.id,
        name: item.product.name,
        sku: item.product.sku,
      },
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toFixed(4),
      discountAmount: item.discountAmount.toFixed(4),
      lineTotal: item.lineTotal.toFixed(4),
      notes: item.notes,
    };
  }

  private formatPaymentResponse(payment: {
    id: string;
    method: string;
    amount: Prisma.Decimal;
    status: string;
    transactionRef: string | null;
    notes: string | null;
  }): SalePaymentResponseDto {
    return {
      id: payment.id,
      method: payment.method as SalePaymentResponseDto['method'],
      amount: payment.amount.toFixed(4),
      status: payment.status as SalePaymentResponseDto['status'],
      transactionRef: payment.transactionRef,
      notes: payment.notes,
    };
  }
}
