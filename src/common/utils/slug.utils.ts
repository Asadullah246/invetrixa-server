import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Model names that support slug uniqueness check
 */
export type SlugModel = 'productCategory' | 'product';

/**
 * Options for creating a unique slug
 */
export interface CreateSlugOptions {
  /** The model to check slug uniqueness against */
  model: SlugModel;
  /** Tenant ID for scoping */
  tenantId: string;
  /** Custom slug (optional) - if not provided, will generate from name */
  slug?: string;
  /** Name to generate slug from (required if slug not provided) */
  name?: string;
  /** ID to exclude from uniqueness check (for updates) */
  excludeId?: string;
}

/**
 * Service for slug operations
 */
@Injectable()
export class SlugService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a unique slug - handles both custom slug and auto-generation from name
   *
   * @example
   * // Create from name (auto-generate)
   * const slug = await slugService.createSlug({
   *   model: 'productCategory',
   *   tenantId,
   *   name: dto.name,
   * });
   *
   * @example
   * // Use custom slug or fallback to name
   * const slug = await slugService.createSlug({
   *   model: 'productCategory',
   *   tenantId,
   *   slug: dto.slug,
   *   name: dto.name,
   * });
   *
   * @example
   * // For updates (exclude current record)
   * const slug = await slugService.createSlug({
   *   model: 'productCategory',
   *   tenantId,
   *   slug: dto.slug,
   *   name: dto.name,
   *   excludeId: id,
   * });
   */
  async createSlug(options: CreateSlugOptions): Promise<string> {
    const { model, tenantId, slug, name, excludeId } = options;

    // Determine base slug - use provided slug or generate from name
    if (!slug && !name) {
      throw new Error('Either slug or name must be provided');
    }

    const baseSlug = slug ? generateSlug(slug) : generateSlug(name!);

    // Ensure uniqueness
    return this.ensureUnique(model, baseSlug, tenantId, excludeId);
  }

  /**
   * Ensure slug is unique by appending -1, -2, etc. if needed
   */
  private async ensureUnique(
    model: SlugModel,
    slug: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (await this.slugExists(model, uniqueSlug, tenantId, excludeId)) {
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    return uniqueSlug;
  }

  /**
   * Check if a slug already exists
   */
  private async slugExists(
    model: SlugModel,
    slug: string,
    tenantId: string,
    excludeId?: string,
  ): Promise<boolean> {
    // NOTE: We check ALL records (including soft-deleted) because
    // the database unique constraint doesn't know about soft deletes
    const where = {
      tenantId,
      slug,
      ...(excludeId && { id: { not: excludeId } }),
    };

    let result: { id: string } | null = null;

    switch (model) {
      case 'productCategory':
        result = await this.prisma.productCategory.findFirst({
          where,
          select: { id: true },
        });
        break;
      case 'product':
        result = await this.prisma.product.findFirst({
          where,
          select: { id: true },
        });
        break;
    }

    return result !== null;
  }
}
