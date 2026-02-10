import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { PricingMethod, Prisma } from 'generated/prisma/client';

/**
 * Result of consuming valuation layers
 */
export interface LayerConsumptionResult {
  totalCost: Prisma.Decimal;
  consumptions: Array<{
    layerId: string;
    quantity: number;
    unitCost: Prisma.Decimal;
    lineCost: Prisma.Decimal;
  }>;
}

/**
 * Service for FIFO/LIFO/MOVING_AVERAGE valuation layer operations
 */
@Injectable()
export class ValuationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve pricing method with hierarchy: Product → Tenant → FIFO fallback
   */
  async resolvePricingMethod(
    productId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<PricingMethod> {
    const db = tx ?? this.prisma;

    // Fetch product with tenant
    const product = await db.product.findUnique({
      where: { id: productId },
      select: {
        pricingMethod: true,
        tenant: {
          select: { defaultPricingMethod: true },
        },
      },
    });

    if (!product) {
      return PricingMethod.FIFO; // Ultimate fallback
    }

    // Priority: Product → Tenant → FIFO
    return (
      product.pricingMethod ??
      product.tenant.defaultPricingMethod ??
      PricingMethod.FIFO
    );
  }

  /**
   * Consume valuation layers based on costing method
   * Returns the consumed layers and total COGS
   */
  async consumeLayers(
    productId: string,
    locationId: string,
    tenantId: string,
    quantity: number,
    method: PricingMethod,
    tx?: Prisma.TransactionClient,
  ): Promise<LayerConsumptionResult> {
    const db = tx ?? this.prisma;

    // For MOVING_AVERAGE, calculate WAC first before consuming
    let movingAverageCost: Prisma.Decimal | null = null;
    if (method === PricingMethod.MOVING_AVERAGE) {
      movingAverageCost = await this.calculateWAC(
        productId,
        locationId,
        tenantId,
        tx,
      );
    }

    // Get available layers ordered by method
    // MOVING_AVERAGE uses FIFO order for layer consumption (bookkeeping only)
    const orderBy: Prisma.ValuationLayerOrderByWithRelationInput =
      method === PricingMethod.LIFO
        ? { createdAt: 'desc' }
        : { createdAt: 'asc' }; // FIFO and MOVING_AVERAGE consume oldest first

    const layers = await db.valuationLayer.findMany({
      where: {
        productId,
        locationId,
        tenantId,
        remainingQty: { gt: 0 },
      },
      orderBy,
    });

    // Calculate consumption
    let remainingToConsume = quantity;
    const consumptions: LayerConsumptionResult['consumptions'] = [];
    let totalCost = new Prisma.Decimal(0);

    for (const layer of layers) {
      if (remainingToConsume <= 0) break;

      const consumeQty = Math.min(remainingToConsume, layer.remainingQty);

      // For MOVING_AVERAGE, use the calculated average cost for all units
      // For FIFO/LIFO, use the actual layer cost
      const unitCost =
        method === PricingMethod.MOVING_AVERAGE && movingAverageCost
          ? movingAverageCost
          : layer.unitCost;

      const lineCost = unitCost.mul(consumeQty);

      consumptions.push({
        layerId: layer.id,
        quantity: consumeQty,
        unitCost,
        lineCost,
      });

      totalCost = totalCost.add(lineCost);
      remainingToConsume -= consumeQty;

      // Update layer remaining quantity
      await db.valuationLayer.update({
        where: { id: layer.id },
        data: { remainingQty: layer.remainingQty - consumeQty },
      });
    }

    return { totalCost, consumptions };
  }

  /**
   * Create valuation layer consumption records
   */
  async createConsumptionRecords(
    movementId: string,
    consumptions: LayerConsumptionResult['consumptions'],
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    await db.valuationLayerConsumption.createMany({
      data: consumptions.map((c) => ({
        valuationLayerId: c.layerId,
        stockMovementId: movementId,
        quantity: c.quantity,
        unitCost: c.unitCost,
      })),
    });
  }

  /**
   * Create a new valuation layer
   */
  async createLayer(
    data: {
      productId: string;
      locationId: string;
      tenantId: string;
      quantity: number;
      unitCost: number;
      sourceMovementId: string;
      batchId?: string;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;

    return db.valuationLayer.create({
      data: {
        productId: data.productId,
        locationId: data.locationId,
        tenantId: data.tenantId,
        originalQty: data.quantity,
        remainingQty: data.quantity,
        unitCost: new Prisma.Decimal(data.unitCost),
        sourceMovementId: data.sourceMovementId,
        batchId: data.batchId ?? null,
      },
    });
  }

  /**
   * Calculate weighted average cost for a product at a location
   */
  async calculateWAC(
    productId: string,
    locationId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Prisma.Decimal> {
    const db = tx ?? this.prisma;

    const layers = await db.valuationLayer.findMany({
      where: {
        productId,
        locationId,
        tenantId,
        remainingQty: { gt: 0 },
      },
    });

    if (layers.length === 0) {
      return new Prisma.Decimal(0);
    }

    let totalValue = new Prisma.Decimal(0);
    let totalQty = 0;

    for (const layer of layers) {
      totalValue = totalValue.add(layer.unitCost.mul(layer.remainingQty));
      totalQty += layer.remainingQty;
    }

    return totalQty > 0 ? totalValue.div(totalQty) : new Prisma.Decimal(0);
  }

  /**
   * Get total available quantity from valuation layers
   */
  async getAvailableQuantity(
    productId: string,
    locationId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const db = tx ?? this.prisma;

    const result = await db.valuationLayer.aggregate({
      where: {
        productId,
        locationId,
        tenantId,
        remainingQty: { gt: 0 },
      },
      _sum: { remainingQty: true },
    });

    return result._sum.remainingQty ?? 0;
  }
}
