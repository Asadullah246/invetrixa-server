import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  StockMovementType,
  StockMovementStatus,
  StockReferenceType,
  Prisma,
} from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import { ValuationService } from './valuation.service';
import { BalanceService } from './balance.service';
import { StockValidationService } from './stock-validation.service';
import {
  QueryMovementDto,
  MovementWithRelationsResponseDto,
  MovementDetailResponseDto,
  BulkStockInDto,
  BulkStockInResponseDto,
  BulkStockOutDto,
  BulkStockOutResponseDto,
  BulkStockAdjustDto,
  BulkStockAdjustResponseDto,
} from '../dto';

@Injectable()
export class MovementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly valuationService: ValuationService,
    private readonly balanceService: BalanceService,
    private readonly stockValidationService: StockValidationService,
  ) {}

  /**
   * Create stock IN movement (single or multiple products)
   * Optimized for bulk operations with batch validation and parallel processing
   */
  async stockIn(
    tenantId: string,
    userId: string,
    dto: BulkStockInDto,
    tx?: Prisma.TransactionClient,
  ): Promise<BulkStockInResponseDto> {
    // Validate products and location
    const productIds = dto.items.map((item) => item.productId);
    await this.stockValidationService.validateProducts(tenantId, productIds);
    await this.stockValidationService.validateLocation(
      tenantId,
      dto.locationId,
    );

    const referenceType = dto.referenceType ?? StockReferenceType.PURCHASE;

    const execute = async (transaction: Prisma.TransactionClient) => {
      // Prepare movement data for batch insert
      const movementData = dto.items.map((item) => {
        const unitCostDecimal = new Prisma.Decimal(item.unitCost);
        return {
          movementType: StockMovementType.IN,
          quantity: item.quantity,
          unitCost: unitCostDecimal,
          totalCost: unitCostDecimal.mul(item.quantity),
          referenceType,
          referenceId: dto.referenceId ?? null,
          status: StockMovementStatus.COMPLETED,
          note: dto.note ?? null,
          metadata: { source: 'stock_in' },
          productId: item.productId,
          locationId: dto.locationId,
          tenantId,
          createdById: userId,
        };
      });

      // Bulk create movements
      const movements = await Promise.all(
        movementData.map((data) =>
          transaction.stockMovement.create({ data, select: { id: true } }),
        ),
      );

      const movementIds = movements.map((m) => m.id);
      const totalQuantity = dto.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      // Create valuation layers and update balances in parallel per item
      await Promise.all(
        dto.items.map(async (item, index) => {
          const movementId = movementIds[index];

          // Create valuation layer
          await this.valuationService.createLayer(
            {
              productId: item.productId,
              locationId: dto.locationId,
              tenantId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              sourceMovementId: movementId,
              batchId: item.batchId,
            },
            transaction,
          );

          // Update inventory balance
          await this.balanceService.updateBalance(
            item.productId,
            dto.locationId,
            tenantId,
            item.quantity,
            transaction,
          );
        }),
      );

      return {
        success: true,
        message: `Successfully received ${dto.items.length} item(s)`,
        totalItems: dto.items.length,
        totalQuantity,
        movementIds,
      };
    };

    if (tx) {
      return execute(tx);
    }

    return this.prisma.$transaction(execute);
  }

  /**
   * Create stock OUT movement (single or multiple products)
   * Optimized for bulk operations with batch validation and parallel processing
   */
  async stockOut(
    tenantId: string,
    userId: string,
    dto: BulkStockOutDto,
    tx?: Prisma.TransactionClient,
  ): Promise<BulkStockOutResponseDto> {
    // Validate products, location, and stock availability
    const productIds = dto.items.map((item) => item.productId);
    await this.stockValidationService.validateProducts(tenantId, productIds);
    await this.stockValidationService.validateLocation(
      tenantId,
      dto.locationId,
    );
    await this.stockValidationService.validateStockAvailability(
      tenantId,
      dto.locationId,
      dto.items,
    );

    const referenceType = dto.referenceType ?? StockReferenceType.SALE;

    const execute = async (transaction: Prisma.TransactionClient) => {
      const movementIds: string[] = [];
      let totalQuantity = 0;
      let grandTotalCost = new Prisma.Decimal(0);

      for (const item of dto.items) {
        // Resolve pricing method for each product
        const pricingMethod = await this.valuationService.resolvePricingMethod(
          item.productId,
          tenantId,
          transaction,
        );

        // Consume valuation layers
        const { totalCost, consumptions } =
          await this.valuationService.consumeLayers(
            item.productId,
            dto.locationId,
            tenantId,
            item.quantity,
            pricingMethod,
            transaction,
          );

        // Calculate weighted average unit cost from consumptions
        const unitCost =
          consumptions.length > 0
            ? totalCost.div(item.quantity)
            : new Prisma.Decimal(0);

        // Create movement record
        const movement = await transaction.stockMovement.create({
          data: {
            movementType: StockMovementType.OUT,
            quantity: item.quantity,
            unitCost,
            totalCost,
            referenceType,
            referenceId: dto.referenceId ?? null,
            status: StockMovementStatus.COMPLETED,
            note: dto.note ?? null,
            metadata: { source: 'stock_out', costingMethod: pricingMethod },
            productId: item.productId,
            locationId: dto.locationId,
            tenantId,
            createdById: userId,
          },
          select: { id: true },
        });

        movementIds.push(movement.id);
        totalQuantity += item.quantity;
        grandTotalCost = grandTotalCost.add(totalCost);

        // Create consumption records for audit trail
        await this.valuationService.createConsumptionRecords(
          movement.id,
          consumptions,
          transaction,
        );

        // Update inventory balance
        await this.balanceService.updateBalance(
          item.productId,
          dto.locationId,
          tenantId,
          -item.quantity,
          transaction,
        );
      }

      return {
        success: true,
        message: `Successfully released ${dto.items.length} item(s)`,
        totalItems: dto.items.length,
        totalQuantity,
        totalCost: Number(grandTotalCost),
        movementIds,
      };
    };

    if (tx) {
      return execute(tx);
    }

    return this.prisma.$transaction(execute);
  }

  /**
   * Create stock adjustment (multiple products, each can be +/- quantity)
   * Positive quantity = stock in, Negative quantity = stock out
   */
  async adjust(
    tenantId: string,
    userId: string,
    dto: BulkStockAdjustDto,
  ): Promise<BulkStockAdjustResponseDto> {
    // Validate products and location
    const productIds = dto.items.map((item) => item.productId);
    await this.stockValidationService.validateProducts(tenantId, productIds);
    await this.stockValidationService.validateLocation(
      tenantId,
      dto.locationId,
    );

    // Validate stock availability for negative adjustments
    const negativeItems = dto.items
      .filter((item) => item.quantity < 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Math.abs(item.quantity),
      }));
    if (negativeItems.length > 0) {
      await this.stockValidationService.validateStockAvailability(
        tenantId,
        dto.locationId,
        negativeItems,
      );
    }

    const note = `${dto.reason}${dto.note ? ` - ${dto.note}` : ''}`;

    return this.prisma.$transaction(async (tx) => {
      const movementIds: string[] = [];
      let positiveCount = 0;
      let negativeCount = 0;

      for (const item of dto.items) {
        const isPositive = item.quantity > 0;
        const absQuantity = Math.abs(item.quantity);

        if (isPositive) {
          // Positive adjustment = stock in
          const unitCost = item.unitCost ?? 0;
          const unitCostDecimal = new Prisma.Decimal(unitCost);

          const movement = await tx.stockMovement.create({
            data: {
              movementType: StockMovementType.IN,
              quantity: absQuantity,
              unitCost: unitCostDecimal,
              totalCost: unitCostDecimal.mul(absQuantity),
              referenceType: StockReferenceType.ADJUSTMENT,
              status: StockMovementStatus.COMPLETED,
              note,
              metadata: { source: 'adjustment', reason: dto.reason },
              productId: item.productId,
              locationId: dto.locationId,
              tenantId,
              createdById: userId,
            },
            select: { id: true },
          });

          movementIds.push(movement.id);
          positiveCount++;

          // Create valuation layer
          await this.valuationService.createLayer(
            {
              productId: item.productId,
              locationId: dto.locationId,
              tenantId,
              quantity: absQuantity,
              unitCost,
              sourceMovementId: movement.id,
            },
            tx,
          );

          // Update balance
          await this.balanceService.updateBalance(
            item.productId,
            dto.locationId,
            tenantId,
            absQuantity,
            tx,
          );
        } else {
          // Negative adjustment = stock out
          const pricingMethod =
            await this.valuationService.resolvePricingMethod(
              item.productId,
              tenantId,
              tx,
            );

          const { totalCost, consumptions } =
            await this.valuationService.consumeLayers(
              item.productId,
              dto.locationId,
              tenantId,
              absQuantity,
              pricingMethod,
              tx,
            );

          const unitCost =
            consumptions.length > 0
              ? totalCost.div(absQuantity)
              : new Prisma.Decimal(0);

          const movement = await tx.stockMovement.create({
            data: {
              movementType: StockMovementType.OUT,
              quantity: absQuantity,
              unitCost,
              totalCost,
              referenceType: StockReferenceType.ADJUSTMENT,
              status: StockMovementStatus.COMPLETED,
              note,
              metadata: {
                source: 'adjustment',
                reason: dto.reason,
                costingMethod: pricingMethod,
              },
              productId: item.productId,
              locationId: dto.locationId,
              tenantId,
              createdById: userId,
            },
            select: { id: true },
          });

          movementIds.push(movement.id);
          negativeCount++;

          await this.valuationService.createConsumptionRecords(
            movement.id,
            consumptions,
            tx,
          );

          await this.balanceService.updateBalance(
            item.productId,
            dto.locationId,
            tenantId,
            -absQuantity,
            tx,
          );
        }
      }

      return {
        success: true,
        message: `Successfully adjusted ${dto.items.length} item(s)`,
        totalItems: dto.items.length,
        positiveAdjustments: positiveCount,
        negativeAdjustments: negativeCount,
        movementIds,
      };
    });
  }

  /**
   * Get all stock movements with filters and pagination
   */
  async findAll(
    tenantId: string,
    query: QueryMovementDto,
  ): Promise<{
    data: MovementWithRelationsResponseDto[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);
    const where = this.buildFilter(tenantId, filterParams);

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        ...paginationPrismaQuery,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          location: { select: { id: true, name: true, code: true } },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({ ...paginationData, total }),
      data: data.map((m) => this.formatMovementResponse(m)),
    };
  }

  /**
   * Get single movement by ID with consumption details
   */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<MovementDetailResponseDto> {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, tenantId },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        location: { select: { id: true, name: true, code: true } },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!movement) {
      throw new NotFoundException('Stock movement not found');
    }

    // Get consumptions separately if this is an OUT movement
    let consumptions: Array<{
      layerId: string;
      quantity: number;
      unitCost: Prisma.Decimal;
    }> = [];
    if (movement.movementType === StockMovementType.OUT) {
      const layerConsumptions =
        await this.prisma.valuationLayerConsumption.findMany({
          where: { stockMovementId: id },
          select: { valuationLayerId: true, quantity: true, unitCost: true },
        });
      consumptions = layerConsumptions.map((c) => ({
        layerId: c.valuationLayerId,
        quantity: c.quantity,
        unitCost: c.unitCost,
      }));
    }

    return this.formatMovementResponse(movement, consumptions);
  }

  /**
   * Build filter for movement queries
   */
  private buildFilter(
    tenantId: string,
    filterParams: Partial<QueryMovementDto>,
  ): Prisma.StockMovementWhereInput {
    const conditions: Prisma.StockMovementWhereInput[] = [{ tenantId }];

    if (filterParams.productId)
      conditions.push({ productId: filterParams.productId });
    if (filterParams.locationId)
      conditions.push({ locationId: filterParams.locationId });
    if (filterParams.movementType)
      conditions.push({ movementType: filterParams.movementType });
    if (filterParams.status) conditions.push({ status: filterParams.status });
    if (filterParams.referenceType)
      conditions.push({ referenceType: filterParams.referenceType });

    // Search filter - searches product name, SKU, note, and reference ID
    if (filterParams.search) {
      const term = filterParams.search.trim();
      conditions.push({
        OR: [
          { note: { contains: term, mode: 'insensitive' } },
          { referenceId: { contains: term, mode: 'insensitive' } },
          { product: { name: { contains: term, mode: 'insensitive' } } },
          { product: { sku: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    if (filterParams.dateFrom || filterParams.dateTo) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (filterParams.dateFrom)
        dateFilter.gte = new Date(filterParams.dateFrom);
      if (filterParams.dateTo) dateFilter.lte = new Date(filterParams.dateTo);
      conditions.push({ createdAt: dateFilter });
    }

    return { AND: conditions };
  }

  /**
   * Format movement for response
   */
  private formatMovementResponse(
    movement: Prisma.StockMovementGetPayload<{
      include: {
        product: { select: { id: true; name: true; sku: true } };
        location: { select: { id: true; name: true; code: true } };
        createdBy: {
          select: { id: true; firstName: true; lastName: true; email: true };
        };
      };
    }>,
    consumptions?: Array<{
      layerId: string;
      quantity: number;
      unitCost: Prisma.Decimal;
    }>,
  ): MovementDetailResponseDto {
    return {
      id: movement.id,
      movementType: movement.movementType,
      quantity: movement.quantity,
      unitCost: movement.unitCost.toFixed(4),
      totalCost: movement.totalCost.toFixed(4),
      referenceType: movement.referenceType,
      referenceId: movement.referenceId,
      status: movement.status,
      note: movement.note,
      productId: movement.productId,
      locationId: movement.locationId,
      tenantId: movement.tenantId,
      createdById: movement.createdById,
      createdAt: movement.createdAt,
      product: movement.product,
      location: movement.location,
      createdBy: movement.createdBy
        ? {
            id: movement.createdBy.id,
            name: `${movement.createdBy.firstName} ${movement.createdBy.lastName}`,
            email: movement.createdBy.email,
          }
        : null,
      consumptions: consumptions?.map((c) => ({
        id: c.layerId,
        quantity: c.quantity,
        unitCost: c.unitCost.toFixed(4),
      })),
    };
  }
}
