import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Sanitize SKU - remove spaces and special characters
 */
export function sanitizeSku(sku: string): string {
  return sku
    .toUpperCase()
    .trim()
    .replace(/[^\w-]/g, '-') // Replace non-alphanumeric (except hyphens) with hyphen
    .replace(/-+/g, '-') // Remove multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate a URL-friendly SKU from text
 */
export function generateSkuFromName(text: string): string {
  return sanitizeSku(text);
}

/**
 * Generate variant SKU suffix from attributes
 */
export function generateVariantSkuSuffix(
  attributes: Array<{ key: string; values: string[] }>,
  index: number,
): string {
  if (!attributes || attributes.length === 0) {
    return `V${index + 1}`;
  }

  return attributes
    .map((a) => sanitizeSku((a.values[0] || '').substring(0, 3)))
    .join('-');
}

export interface CreateSkuOptions {
  tenantId: string;
  baseSku: string;
  excludeId?: string;
}

export interface CreateVariantSkuOptions {
  tenantId: string;
  parentSku: string;
  attributes?: Array<{ key: string; values: string[] }>;
  index: number;
  excludeId?: string;
}

export interface EnsureSkuUniqueOptions {
  tenantId: string;
  sku: string;
  excludeId?: string;
  errorMessage?: string;
}

@Injectable()
export class SkuService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a unique SKU - checks DB, appends -1, -2, etc. if needed
   */
  async createSku(options: CreateSkuOptions): Promise<string> {
    const { tenantId, baseSku, excludeId } = options;
    const sanitized = sanitizeSku(baseSku);
    return this.ensureUniqueWithSuffix(tenantId, sanitized, excludeId);
  }

  /**
   * Create a unique variant SKU from parent SKU + attributes
   */
  async createVariantSku(options: CreateVariantSkuOptions): Promise<string> {
    const { tenantId, parentSku, attributes, index, excludeId } = options;
    const suffix = generateVariantSkuSuffix(attributes ?? [], index);
    const baseSku = `${parentSku}-${suffix}`;
    return this.ensureUniqueWithSuffix(tenantId, baseSku, excludeId);
  }

  /**
   * Ensure SKU is unique - throws ConflictException if already exists
   */
  async ensureUnique(options: EnsureSkuUniqueOptions): Promise<void> {
    const {
      tenantId,
      sku,
      excludeId,
      errorMessage = 'A product with this SKU already exists.',
    } = options;

    if (await this.skuExists(tenantId, sku, excludeId)) {
      throw new ConflictException(errorMessage);
    }
  }

  /**
   * Find existing SKUs from a list (for bulk validation)
   */
  /**
   * Find existing SKUs from a list (for bulk validation).
   * Includes soft-deleted products to ensure SKU uniqueness across all records.
   */
  async findExistingSkus(
    tenantId: string,
    skus: string[],
    excludeIds?: string[],
  ): Promise<string[]> {
    const result = await this.prisma.product.findMany({
      where: {
        tenantId,
        sku: { in: skus },
        ...(excludeIds?.length && { id: { notIn: excludeIds } }),
      },
      select: { sku: true },
    });

    return result.map((r) => r.sku);
  }

  private async ensureUniqueWithSuffix(
    tenantId: string,
    baseSku: string,
    excludeId?: string,
  ): Promise<string> {
    let uniqueSku = baseSku;
    let counter = 1;

    while (await this.skuExists(tenantId, uniqueSku, excludeId)) {
      uniqueSku = `${baseSku}-${counter}`;
      counter++;
    }

    return uniqueSku;
  }

  /**
   * Check if SKU already exists for a tenant.
   * Includes soft-deleted products to ensure SKU uniqueness across all records.
   */
  private async skuExists(
    tenantId: string,
    sku: string,
    excludeId?: string,
  ): Promise<boolean> {
    const result = await this.prisma.product.findFirst({
      where: {
        tenantId,
        sku,
        ...(excludeId && { id: { not: excludeId } }),
      },
      select: { id: true },
    });

    return result !== null;
  }
}
