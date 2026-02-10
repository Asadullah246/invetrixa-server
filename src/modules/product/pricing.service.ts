import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { MarkupType } from 'generated/prisma/client';
import { ValuationService } from '../stock/services/valuation.service';

/**
 * Result of selling price calculation
 */
export interface SellingPriceResult {
  cost: number;
  sellingPrice: number;
  markupType: MarkupType | null;
  markupValue: number | null;
  margin: number; // sellingPrice - cost
  marginPercent: number; // ((sellingPrice - cost) / cost) * 100
}

/**
 * Service for calculating selling prices based on product markup settings
 */
@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly valuationService: ValuationService,
  ) {}

  /**
   * Calculate selling price for a product at a specific location
   * Uses Moving Average Cost as the cost basis
   */
  async calculateSellingPrice(
    productId: string,
    locationId: string,
    tenantId: string,
  ): Promise<SellingPriceResult> {
    // Get product with markup settings
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      select: {
        id: true,
        markupType: true,
        markupValue: true,
        minSellingPrice: true,
        maxSellingPrice: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get Moving Average Cost as cost basis
    const wac = await this.valuationService.calculateWAC(
      productId,
      locationId,
      tenantId,
    );
    const cost = Number(wac);

    // Calculate selling price based on markup type
    let sellingPrice = this.applyMarkup(
      cost,
      product.markupType,
      product.markupValue ? Number(product.markupValue) : null,
    );

    // Apply min/max bounds
    if (product.minSellingPrice) {
      sellingPrice = Math.max(sellingPrice, Number(product.minSellingPrice));
    }
    if (product.maxSellingPrice) {
      sellingPrice = Math.min(sellingPrice, Number(product.maxSellingPrice));
    }

    // Calculate margin
    const margin = sellingPrice - cost;
    const marginPercent = cost > 0 ? (margin / cost) * 100 : 0;

    return {
      cost,
      sellingPrice,
      markupType: product.markupType,
      markupValue: product.markupValue ? Number(product.markupValue) : null,
      margin,
      marginPercent: Math.round(marginPercent * 100) / 100, // Round to 2 decimals
    };
  }

  /**
   * Calculate selling prices for multiple products at a location
   */
  async calculateBulkSellingPrices(
    productIds: string[],
    locationId: string,
    tenantId: string,
  ): Promise<Map<string, SellingPriceResult>> {
    const results = new Map<string, SellingPriceResult>();

    for (const productId of productIds) {
      try {
        const result = await this.calculateSellingPrice(
          productId,
          locationId,
          tenantId,
        );
        results.set(productId, result);
      } catch {
        // Skip products that can't be priced
      }
    }

    return results;
  }

  /**
   * Apply markup to cost based on markup type
   */
  private applyMarkup(
    cost: number,
    markupType: MarkupType | null,
    markupValue: number | null,
  ): number {
    if (!markupType || markupValue === null) {
      // No markup configured - return cost as selling price
      return cost;
    }

    switch (markupType) {
      case MarkupType.PERCENT:
        // markupValue is a percentage (e.g., 50 = 50% markup)
        return cost * (1 + markupValue / 100);

      case MarkupType.FIXED_AMOUNT:
        // markupValue is a fixed amount to add
        return cost + markupValue;

      case MarkupType.MANUAL:
        // markupValue IS the selling price
        return markupValue;

      default:
        return cost;
    }
  }

  /**
   * Get suggested selling price without needing a location
   * Uses a provided cost instead of calculating Moving Average
   */
  calculateFromCost(
    cost: number,
    markupType: MarkupType | null,
    markupValue: number | null,
    minPrice?: number | null,
    maxPrice?: number | null,
  ): number {
    let sellingPrice = this.applyMarkup(cost, markupType, markupValue);

    if (minPrice !== null && minPrice !== undefined) {
      sellingPrice = Math.max(sellingPrice, minPrice);
    }
    if (maxPrice !== null && maxPrice !== undefined) {
      sellingPrice = Math.min(sellingPrice, maxPrice);
    }

    return sellingPrice;
  }
}
