import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  TransferStatus,
  StockMovementType,
  StockMovementStatus,
  StockReferenceType,
  Prisma,
} from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import { BalanceService } from './balance.service';
import { ValuationService } from './valuation.service';
import { StockValidationService } from './stock-validation.service';
import {
  CreateTransferDto,
  ShipTransferDto,
  ReceiveTransferDto,
  QueryTransferDto,
  CreateTransferResponseDto,
  TransferWithRelationsResponseDto,
  TransferDetailResponseDto,
} from '../dto';

/**
 * Service for managing stock transfers between locations.
 * Handles the full transfer lifecycle: create, ship, receive, cancel.
 */
@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balanceService: BalanceService,
    private readonly valuationService: ValuationService,
    private readonly stockValidationService: StockValidationService,
  ) {}

  /**
   * Generate unique transfer number.
   */
  private async generateTransferNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `TRF-${year}-`;

    const lastTransfer = await this.prisma.stockTransfer.findFirst({
      where: {
        tenantId,
        transferNumber: { startsWith: prefix },
      },
      orderBy: { transferNumber: 'desc' },
      select: { transferNumber: true },
    });

    if (lastTransfer) {
      const lastNum = parseInt(
        lastTransfer.transferNumber.replace(prefix, ''),
        10,
      );
      return `${prefix}${String(lastNum + 1).padStart(4, '0')}`;
    }

    return `${prefix}0001`;
  }

  /**
   * Create a new transfer.
   * If status is IN_TRANSIT, the transfer will be shipped immediately.
   */
  async create(
    tenantId: string,
    userId: string,
    dto: CreateTransferDto,
  ): Promise<{ message: string; data: CreateTransferResponseDto }> {
    // Validate locations exist and are different
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException(
        'Source and destination locations must be different',
      );
    }

    await this.stockValidationService.validateLocations(tenantId, [
      dto.fromLocationId,
      dto.toLocationId,
    ]);

    // Validate all products exist
    const productIds = dto.items.map((p) => p.productId);
    await this.stockValidationService.validateProducts(tenantId, productIds);

    const transferNumber = await this.generateTransferNumber(tenantId);

    const transfer = await this.prisma.stockTransfer.create({
      data: {
        transferNumber,
        status: TransferStatus.DRAFT,
        note: dto.note,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        tenantId,
        createdById: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            requestedQuantity: item.requestedQuantity,
          })),
        },
      },
      select: { id: true, transferNumber: true },
    });

    // If status is IN_TRANSIT, ship immediately
    if (dto.status === TransferStatus.IN_TRANSIT) {
      await this.ship(tenantId, userId, transfer.id);
      return {
        message: 'Transfer created and shipped successfully',
        data: {
          transferId: transfer.id,
          transferNumber: transfer.transferNumber,
        },
      };
    }

    return {
      message: 'Transfer created successfully',
      data: {
        transferId: transfer.id,
        transferNumber: transfer.transferNumber,
      },
    };
  }

  /**
   * Get all transfers with pagination and filters.
   */
  async findAll(
    tenantId: string,
    query: QueryTransferDto,
  ): Promise<{
    data: TransferWithRelationsResponseDto[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);
    const where = this.buildFilter(tenantId, filterParams);

    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        where,
        ...paginationPrismaQuery,
        include: this.getListIncludes(),
      }),
      this.prisma.stockTransfer.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({ ...paginationData, total }),
      data: data.map((t) => this.formatListResponse(t)),
    };
  }

  /**
   * Get single transfer by ID with full details.
   */
  async findOne(
    tenantId: string,
    id: string,
  ): Promise<TransferDetailResponseDto> {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: this.getDetailIncludes(),
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return this.formatDetailResponse(transfer);
  }

  /**
   * Ship transfer (DRAFT → IN_TRANSIT).
   * Validates stock availability and creates OUT movements from source location.
   * Stores shippedUnitCost for accurate receive/cancel operations.
   */
  async ship(
    tenantId: string,
    userId: string,
    id: string,
    dto?: ShipTransferDto,
  ): Promise<{ message: string }> {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: { items: { include: { product: true } } },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.DRAFT) {
      throw new ConflictException(
        `Cannot ship transfer with status ${transfer.status}`,
      );
    }

    // Validate stock availability at source location (considering reservations)
    const stockItems = transfer.items.map((item) => ({
      productId: item.productId,
      quantity: item.requestedQuantity,
    }));
    await this.stockValidationService.validateStockAvailability(
      tenantId,
      transfer.fromLocationId,
      stockItems,
    );

    // Execute shipment in transaction
    await this.prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.IN_TRANSIT,
          shippedAt: new Date(),
          note: dto?.note
            ? `${transfer.note ?? ''}\n[Ship] ${dto.note}`.trim()
            : transfer.note,
        },
      });

      // Update item shipped quantities and create OUT movements
      for (const item of transfer.items) {
        const shippedQty = item.requestedQuantity;

        // Calculate unit cost BEFORE consuming layers
        const unitCost = await this.valuationService.calculateWAC(
          item.productId,
          transfer.fromLocationId,
          tenantId,
          tx,
        );

        // Store shipped unit cost on item for later use in receive/cancel
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: {
            shippedQuantity: shippedQty,
            shippedUnitCost: unitCost,
          },
        });

        // Create OUT movement from source location
        await tx.stockMovement.create({
          data: {
            movementType: StockMovementType.OUT,
            quantity: shippedQty,
            unitCost,
            totalCost: unitCost.mul(shippedQty),
            referenceType: StockReferenceType.TRANSFER,
            referenceId: transfer.transferNumber,
            status: StockMovementStatus.COMPLETED,
            note: `Transfer to ${transfer.toLocationId}`,
            productId: item.productId,
            locationId: transfer.fromLocationId,
            tenantId,
            createdById: userId,
            transferId: id,
          },
        });

        // Consume valuation layers using resolved pricing method
        const pricingMethod = await this.valuationService.resolvePricingMethod(
          item.productId,
          tenantId,
          tx,
        );
        await this.valuationService.consumeLayers(
          item.productId,
          transfer.fromLocationId,
          tenantId,
          shippedQty,
          pricingMethod,
          tx,
        );

        // Update source balance
        await this.balanceService.updateBalance(
          item.productId,
          transfer.fromLocationId,
          tenantId,
          -shippedQty,
          tx,
        );
      }
    });

    return { message: 'Transfer shipped successfully' };
  }

  /**
   * Receive transfer (IN_TRANSIT → COMPLETED).
   * Creates IN movements at destination location using stored shippedUnitCost.
   * Tracks shortages with required shortage reason.
   */
  async receive(
    tenantId: string,
    userId: string,
    id: string,
    dto: ReceiveTransferDto,
  ): Promise<{ message: string }> {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: { items: { include: { product: true } } },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.IN_TRANSIT) {
      throw new ConflictException(
        `Cannot receive transfer with status ${transfer.status}`,
      );
    }

    // Build map for quick lookup
    const itemMap = new Map(
      dto.items.map((i) => [
        i.productId,
        {
          receivedQuantity: i.receivedQuantity,
          shortageReason: i.shortageReason,
        },
      ]),
    );

    // Validate received quantities and shortage reasons
    for (const item of transfer.items) {
      const received = itemMap.get(item.productId);
      if (received === undefined) {
        throw new BadRequestException(
          `Missing received quantity for product ${item.product.name}`,
        );
      }
      if (received.receivedQuantity > item.shippedQuantity) {
        throw new BadRequestException(
          `Cannot receive more than shipped for product ${item.product.name}. Shipped: ${item.shippedQuantity}, Received: ${received.receivedQuantity}`,
        );
      }
      // Require shortage reason if there's a discrepancy
      const shortage = item.shippedQuantity - received.receivedQuantity;
      if (shortage > 0 && !received.shortageReason) {
        throw new BadRequestException(
          `Shortage reason required for product ${item.product.name}. Shipped: ${item.shippedQuantity}, Received: ${received.receivedQuantity}, Shortage: ${shortage}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      // Update transfer status
      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.COMPLETED,
          receivedAt: new Date(),
          note: dto.note
            ? `${transfer.note ?? ''}\n[Receive] ${dto.note}`.trim()
            : transfer.note,
        },
      });

      // Update item received quantities and create IN movements
      for (const item of transfer.items) {
        const received = itemMap.get(item.productId)!;
        const receivedQty = received.receivedQuantity;

        // Update item with received qty and shortage reason
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: {
            receivedQuantity: receivedQty,
            shortageReason: received.shortageReason,
          },
        });

        if (receivedQty > 0) {
          // Use stored shippedUnitCost for accurate valuation
          const unitCost = item.shippedUnitCost ?? new Prisma.Decimal(0);

          // Create IN movement at destination
          const movement = await tx.stockMovement.create({
            data: {
              movementType: StockMovementType.IN,
              quantity: receivedQty,
              unitCost,
              totalCost: unitCost.mul(receivedQty),
              referenceType: StockReferenceType.TRANSFER,
              referenceId: transfer.transferNumber,
              status: StockMovementStatus.COMPLETED,
              note: `Transfer from ${transfer.fromLocationId}`,
              productId: item.productId,
              locationId: transfer.toLocationId,
              tenantId,
              createdById: userId,
              transferId: id,
            },
          });

          // Create valuation layer at destination with stored cost
          await this.valuationService.createLayer(
            {
              productId: item.productId,
              locationId: transfer.toLocationId,
              tenantId,
              quantity: receivedQty,
              unitCost: Number(unitCost),
              sourceMovementId: movement.id,
            },
            tx,
          );

          // Update destination balance
          await this.balanceService.updateBalance(
            item.productId,
            transfer.toLocationId,
            tenantId,
            receivedQty,
            tx,
          );
        }
      }
    });

    return { message: 'Transfer received successfully' };
  }

  /**
   * Cancel transfer.
   * If IN_TRANSIT, reverses the OUT movements and restores valuation layers.
   */
  async cancel(
    tenantId: string,
    userId: string,
    id: string,
  ): Promise<{ message: string }> {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: { id, tenantId },
      include: { items: true, movements: true },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new ConflictException('Cannot cancel completed transfer');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new ConflictException('Transfer is already cancelled');
    }

    await this.prisma.$transaction(async (tx) => {
      // If in-transit, reverse the OUT movements
      if (transfer.status === TransferStatus.IN_TRANSIT) {
        for (const item of transfer.items) {
          if (item.shippedQuantity > 0) {
            // Use stored shippedUnitCost for accurate reversal
            const unitCost = item.shippedUnitCost ?? new Prisma.Decimal(0);

            // Create reversal IN movement with accurate cost
            const reversalMovement = await tx.stockMovement.create({
              data: {
                movementType: StockMovementType.IN,
                quantity: item.shippedQuantity,
                unitCost,
                totalCost: unitCost.mul(item.shippedQuantity),
                referenceType: StockReferenceType.ADJUSTMENT,
                referenceId: `CANCEL-${transfer.transferNumber}`,
                status: StockMovementStatus.COMPLETED,
                note: 'Transfer cancellation reversal',
                productId: item.productId,
                locationId: transfer.fromLocationId,
                tenantId,
                createdById: userId,
                transferId: id,
              },
            });

            // Restore valuation layer at source location
            await this.valuationService.createLayer(
              {
                productId: item.productId,
                locationId: transfer.fromLocationId,
                tenantId,
                quantity: item.shippedQuantity,
                unitCost: Number(unitCost),
                sourceMovementId: reversalMovement.id,
              },
              tx,
            );

            // Restore balance at source
            await this.balanceService.updateBalance(
              item.productId,
              transfer.fromLocationId,
              tenantId,
              item.shippedQuantity,
              tx,
            );
          }
        }
      }

      // Update transfer status
      await tx.stockTransfer.update({
        where: { id },
        data: {
          status: TransferStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });
    });

    return { message: 'Transfer cancelled successfully' };
  }

  // ==================== HELPER METHODS ====================

  private getListIncludes() {
    return {
      fromLocation: { select: { id: true, name: true, code: true } },
      toLocation: { select: { id: true, name: true, code: true } },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      _count: { select: { items: true } },
      items: { select: { requestedQuantity: true } },
    } as const;
  }

  private getDetailIncludes() {
    return {
      fromLocation: { select: { id: true, name: true, code: true } },
      toLocation: { select: { id: true, name: true, code: true } },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true } },
        },
      },
    } as const;
  }

  private buildFilter(
    tenantId: string,
    filterParams: Partial<QueryTransferDto>,
  ): Prisma.StockTransferWhereInput {
    const conditions: Prisma.StockTransferWhereInput[] = [{ tenantId }];

    if (filterParams.fromLocationId)
      conditions.push({ fromLocationId: filterParams.fromLocationId });
    if (filterParams.toLocationId)
      conditions.push({ toLocationId: filterParams.toLocationId });
    if (filterParams.status) conditions.push({ status: filterParams.status });

    // Search filter for transfer number
    if (filterParams.search) {
      const term = filterParams.search.trim();
      conditions.push({
        transferNumber: { contains: term, mode: 'insensitive' },
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

  private formatListResponse(
    transfer: Prisma.StockTransferGetPayload<{
      include: {
        fromLocation: { select: { id: true; name: true; code: true } };
        toLocation: { select: { id: true; name: true; code: true } };
        createdBy: {
          select: { id: true; firstName: true; lastName: true; email: true };
        };
        _count: { select: { items: true } };
        items: { select: { requestedQuantity: true } };
      };
    }>,
  ): TransferWithRelationsResponseDto {
    const totalRequestedQuantity = transfer.items.reduce(
      (sum, i) => sum + i.requestedQuantity,
      0,
    );

    return {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      status: transfer.status,
      note: transfer.note,
      createdAt: transfer.createdAt,
      shippedAt: transfer.shippedAt,
      receivedAt: transfer.receivedAt,
      cancelledAt: transfer.cancelledAt,
      fromLocation: transfer.fromLocation.name,
      toLocation: transfer.toLocation.name,
      createdBy: transfer.createdBy
        ? `${transfer.createdBy.firstName} ${transfer.createdBy.lastName}`
        : null,
      itemCount: transfer._count?.items ?? transfer.items.length,
      totalRequestedQuantity,
    };
  }

  private formatDetailResponse(
    transfer: Prisma.StockTransferGetPayload<{
      include: {
        fromLocation: { select: { id: true; name: true; code: true } };
        toLocation: { select: { id: true; name: true; code: true } };
        createdBy: {
          select: { id: true; firstName: true; lastName: true; email: true };
        };
        items: {
          include: {
            product: { select: { id: true; name: true; sku: true } };
          };
        };
      };
    }>,
  ): TransferDetailResponseDto {
    const totalRequestedQuantity = transfer.items.reduce(
      (sum, i) => sum + i.requestedQuantity,
      0,
    );

    return {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      status: transfer.status,
      note: transfer.note,
      createdAt: transfer.createdAt,
      shippedAt: transfer.shippedAt,
      receivedAt: transfer.receivedAt,
      cancelledAt: transfer.cancelledAt,
      fromLocation: transfer.fromLocation,
      toLocation: transfer.toLocation,
      createdBy: transfer.createdBy
        ? {
            id: transfer.createdBy.id,
            name: `${transfer.createdBy.firstName} ${transfer.createdBy.lastName}`,
            email: transfer.createdBy.email,
          }
        : null,
      itemCount: transfer.items.length,
      totalRequestedQuantity,
      items: transfer.items.map((item) => ({
        id: item.id,
        product: item.product,
        requestedQuantity: item.requestedQuantity,
        shippedQuantity: item.shippedQuantity,
        receivedQuantity: item.receivedQuantity,
        shortageReason: item.shortageReason,
        note: item.note,
      })),
    };
  }
}
