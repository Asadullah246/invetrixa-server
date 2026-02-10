import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { Prisma, PricingMethod } from 'generated/prisma/client';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import {
  QueryBalanceDto,
  BalanceWithRelationsResponseDto,
  ProductBalanceSummaryDto,
  LocationBalanceSummaryDto,
  LowStockItemDto,
  ValuationReportDto,
  ValuationLineDto,
} from '../dto';

@Injectable()
export class BalanceService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all inventory balances with pagination and filters
   */
  async findAll(
    tenantId: string,
    query: QueryBalanceDto,
  ): Promise<{
    data: BalanceWithRelationsResponseDto[];
    meta: ReturnType<typeof generatePaginationMeta>;
  }> {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);
    const where = this.buildFilter(tenantId, filterParams);

    const [data, total] = await Promise.all([
      this.prisma.inventoryBalance.findMany({
        where,
        ...paginationPrismaQuery,
        include: {
          product: {
            select: { id: true, name: true, sku: true, reorderLevel: true },
          },
          location: { select: { id: true, name: true, code: true } },
        },
      }),
      this.prisma.inventoryBalance.count({ where }),
    ]);

    const items = data.map((item) => ({
      ...item,
      availableQuantity: item.onHandQuantity - item.reservedQuantity,
      isLowStock: item.product.reorderLevel
        ? item.onHandQuantity < item.product.reorderLevel
        : false,
    }));

    return {
      meta: generatePaginationMeta({ ...paginationData, total }),
      data: items,
    };
  }

  /**
   * Get balance summary for a specific product across all locations
   */
  async findByProduct(
    tenantId: string,
    productId: string,
  ): Promise<ProductBalanceSummaryDto> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      select: { id: true, name: true, sku: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const balances = await this.prisma.inventoryBalance.findMany({
      where: { productId, tenantId },
      include: { location: { select: { id: true, name: true } } },
    });

    const locations = balances.map((b) => ({
      locationId: b.locationId,
      locationName: b.location.name,
      onHandQuantity: b.onHandQuantity,
      reservedQuantity: b.reservedQuantity,
      availableQuantity: b.onHandQuantity - b.reservedQuantity,
    }));

    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      totalOnHand: locations.reduce((sum, l) => sum + l.onHandQuantity, 0),
      totalReserved: locations.reduce((sum, l) => sum + l.reservedQuantity, 0),
      totalAvailable: locations.reduce(
        (sum, l) => sum + l.availableQuantity,
        0,
      ),
      locations,
    };
  }

  /**
   * Get balance summary for a specific location across all products
   */
  async findByLocation(
    tenantId: string,
    locationId: string,
  ): Promise<LocationBalanceSummaryDto> {
    const location = await this.prisma.location.findFirst({
      where: { id: locationId, tenantId },
      select: { id: true, name: true, code: true },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    const balances = await this.prisma.inventoryBalance.findMany({
      where: { locationId, tenantId },
      include: { product: { select: { id: true, name: true, sku: true } } },
    });

    const products = balances.map((b) => ({
      productId: b.productId,
      productName: b.product.name,
      productSku: b.product.sku,
      onHandQuantity: b.onHandQuantity,
      reservedQuantity: b.reservedQuantity,
      availableQuantity: b.onHandQuantity - b.reservedQuantity,
    }));

    return {
      locationId: location.id,
      locationName: location.name,
      locationCode: location.code,
      totalUnits: products.reduce((sum, p) => sum + p.onHandQuantity, 0),
      productCount: products.length,
      products,
    };
  }

  /**
   * Get products below reorder level with pagination and filters
   * Uses raw SQL for efficient field comparison at database level
   */
  async findLowStock(
    tenantId: string,
    query: {
      page: number;
      limit: number;
      search?: string;
      locationId?: string;
    },
  ): Promise<{
    meta: ReturnType<typeof generatePaginationMeta>;
    data: LowStockItemDto[];
  }> {
    const { page, limit, search, locationId } = query;
    const offset = (page - 1) * limit;

    // Build base WHERE clause
    const baseConditions = `
      ib."tenantId" = $1
      AND p."reorderLevel" > 0
      AND p."deletedAt" IS NULL
      AND ib."onHandQuantity" < p."reorderLevel"
    `;

    // Build dynamic conditions
    let whereClause = baseConditions;
    const params: (string | number)[] = [tenantId];
    let paramIndex = 2;

    if (locationId) {
      whereClause += ` AND ib."locationId" = $${paramIndex}`;
      params.push(locationId);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.sku ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count total matching records
    const countQuery = `
      SELECT COUNT(*) as count
      FROM inventory_balances ib
      JOIN products p ON ib."productId" = p.id
      JOIN locations l ON ib."locationId" = l.id
      WHERE ${whereClause}
    `;

    const countResult = await this.prisma.$queryRawUnsafe<[{ count: bigint }]>(
      countQuery,
      ...params,
    );
    const total = Number(countResult[0].count);

    // Get paginated data
    const dataQuery = `
      SELECT 
        ib."productId" as "productId",
        p.name as "productName",
        p.sku as "productSku",
        ib."locationId" as "locationId",
        l.name as "locationName",
        ib."onHandQuantity" as "onHandQuantity",
        p."reorderLevel" as "reorderLevel",
        (p."reorderLevel" - ib."onHandQuantity") as shortage
      FROM inventory_balances ib
      JOIN products p ON ib."productId" = p.id
      JOIN locations l ON ib."locationId" = l.id
      WHERE ${whereClause}
      ORDER BY shortage DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const data = await this.prisma.$queryRawUnsafe<LowStockItemDto[]>(
      dataQuery,
      ...params,
      limit,
      offset,
    );

    return {
      meta: generatePaginationMeta({ page, limit, total, skip: offset }),
      data,
    };
  }

  /**
   * Get inventory valuation report
   */
  async getValuation(
    tenantId: string,
    method: PricingMethod,
  ): Promise<ValuationReportDto> {
    const layers = await this.prisma.valuationLayer.findMany({
      where: { tenantId, remainingQty: { gt: 0 } },
      include: {
        product: { select: { id: true, name: true, sku: true } },
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by product+location
    const grouped = new Map<string, typeof layers>();
    for (const layer of layers) {
      const key = `${layer.productId}:${layer.locationId}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(layer);
    }

    let grandTotalValue = 0;
    let grandTotalUnits = 0;
    const items: ValuationLineDto[] = [];

    for (const [, groupLayers] of grouped) {
      const first = groupLayers[0];
      let totalQty = 0;
      let totalValue = 0;

      const layerDetails = groupLayers.map((l) => {
        const unitCostNum = Number(l.unitCost);
        const value = unitCostNum * l.remainingQty;
        totalQty += l.remainingQty;
        totalValue += value;
        return {
          id: l.id,
          unitCost: l.unitCost.toFixed(4),
          remainingQty: l.remainingQty,
          value: value.toFixed(4),
          createdAt: l.createdAt,
        };
      });

      grandTotalValue += totalValue;
      grandTotalUnits += totalQty;

      items.push({
        productId: first.productId,
        productName: first.product.name,
        productSku: first.product.sku,
        locationId: first.locationId,
        locationName: first.location.name,
        totalQuantity: totalQty,
        totalValue: totalValue.toFixed(4),
        averageCost:
          totalQty > 0 ? (totalValue / totalQty).toFixed(4) : '0.0000',
        layers: layerDetails,
      });
    }

    return {
      method,
      totalValue: grandTotalValue.toFixed(4),
      totalUnits: grandTotalUnits,
      items,
    };
  }

  /**
   * Update or create inventory balance for a product/location
   */
  async updateBalance(
    productId: string,
    locationId: string,
    tenantId: string,
    quantityChange: number,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;

    await db.inventoryBalance.upsert({
      where: {
        productId_locationId: { productId, locationId },
      },
      create: {
        productId,
        locationId,
        tenantId,
        onHandQuantity: Math.max(0, quantityChange),
        reservedQuantity: 0,
      },
      update: {
        onHandQuantity: { increment: quantityChange },
      },
    });
  }

  /**
   * Build filter for balance queries
   */
  private buildFilter(
    tenantId: string,
    filterParams: Partial<QueryBalanceDto>,
  ): Prisma.InventoryBalanceWhereInput {
    const conditions: Prisma.InventoryBalanceWhereInput[] = [{ tenantId }];

    if (filterParams.productId)
      conditions.push({ productId: filterParams.productId });
    if (filterParams.locationId)
      conditions.push({ locationId: filterParams.locationId });

    // Search filter - searches product name, SKU, and location name
    if (filterParams.search) {
      const term = filterParams.search.trim();
      conditions.push({
        OR: [
          { product: { name: { contains: term, mode: 'insensitive' } } },
          { product: { sku: { contains: term, mode: 'insensitive' } } },
          { location: { name: { contains: term, mode: 'insensitive' } } },
          { location: { code: { contains: term, mode: 'insensitive' } } },
        ],
      });
    }

    return { AND: conditions };
  }
}
