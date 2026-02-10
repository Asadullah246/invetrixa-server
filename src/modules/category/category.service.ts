import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from 'generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SlugService } from '@/common/utils/slug.utils';
import { isUUID } from '@/common/utils/uuid.utils';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto } from './dto';

@Injectable()
export class CategoryService {
  constructor(
    private prisma: PrismaService,
    private slugService: SlugService,
  ) {}

  /**
   * Validate that all category IDs exist and belong to the tenant
   * @param tenantId - Tenant ID to scope the query
   * @param categoryIds - Array of category IDs to validate
   * @throws NotFoundException if any category is not found
   */
  async validateCategoryIds(
    tenantId: string,
    categoryIds: string[],
  ): Promise<void> {
    if (!categoryIds?.length) {
      return;
    }

    // Dedupe IDs to handle duplicates in input array
    const uniqueIds = [...new Set(categoryIds)];

    const categories = await this.prisma.productCategory.findMany({
      where: {
        id: { in: uniqueIds },
        tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (categories.length !== uniqueIds.length) {
      const foundIds = new Set(categories.map((c) => c.id));
      const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Category not found: ${missingIds.join(', ')}`,
      );
    }
  }

  /**
   * Create a new category
   */
  async create(tenantId: string, dto: CreateCategoryDto) {
    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.productCategory.findFirst({
        where: {
          id: dto.parentId,
          tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found.');
      }
    }

    // Generate unique slug
    const slug = await this.slugService.createSlug({
      model: 'productCategory',
      tenantId,
      slug: dto.slug,
      name: dto.name,
    });

    const category = await this.prisma.productCategory.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        image: dto.image,
        status: dto.status,
        parentId: dto.parentId,
        tenantId,
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return category;
  }

  /**
   * Get all categories with filtering and pagination
   */
  async findAll(tenantId: string, query: QueryCategoryDto) {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);

    // Build where clause using filter builder
    const where = this.buildCategoryFilter(tenantId, filterParams);

    // Execute queries in parallel
    const [categories, total] = await Promise.all([
      this.prisma.productCategory.findMany({
        where,
        ...paginationPrismaQuery,
        include: {
          parent: {
            select: { id: true, name: true, slug: true },
          },
          _count: {
            select: {
              children: { where: { deletedAt: null } },
              products: { where: { product: { deletedAt: null } } },
            },
          },
        },
      }),
      this.prisma.productCategory.count({ where }),
    ]);

    return {
      meta: generatePaginationMeta({
        ...paginationData,
        total,
      }),
      data: categories,
    };
  }

  /**
   * Get a single category by ID or slug
   */
  async findOne(tenantId: string, identifier: string) {
    const where: Prisma.ProductCategoryWhereInput = {
      tenantId,
      deletedAt: null,
      ...(isUUID(identifier) ? { id: identifier } : { slug: identifier }),
    };

    const category = await this.prisma.productCategory.findFirst({
      where,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        children: {
          where: { deletedAt: null },
          select: { id: true, name: true, slug: true, status: true },
        },
        _count: {
          select: {
            products: { where: { product: { deletedAt: null } } },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  /**
   * Update a category
   */
  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    // Check if category exists
    const existing = await this.prisma.productCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, slug: true },
    });

    if (!existing) {
      throw new NotFoundException('Category not found.');
    }

    // Validate parent if provided
    if (dto.parentId) {
      // Prevent self-referencing
      if (dto.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent.');
      }

      // Check parent exists
      const parent = await this.prisma.productCategory.findFirst({
        where: {
          id: dto.parentId,
          tenantId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found.');
      }

      // Prevent circular reference (parent cannot be a child of this category)
      const isCircular = await this.checkCircularReference(
        tenantId,
        id,
        dto.parentId,
      );
      if (isCircular) {
        throw new BadRequestException(
          'Cannot set parent: would create circular reference.',
        );
      }
    }

    // Handle slug update - only regenerate if name or slug changed
    let slug: string | undefined;
    if (dto.slug || dto.name) {
      slug = await this.slugService.createSlug({
        model: 'productCategory',
        tenantId,
        slug: dto.slug,
        name: dto.name,
        excludeId: id,
      });
    }

    const category = await this.prisma.productCategory.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(slug && { slug }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.image !== undefined && { image: dto.image }),
        ...(dto.status && { status: dto.status }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return category;
  }

  /**
   * Soft delete a category
   */
  async remove(tenantId: string, id: string) {
    // Check if category exists
    const category = await this.prisma.productCategory.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            // Only count non-deleted children and products
            children: { where: { deletedAt: null } },
            products: { where: { product: { deletedAt: null } } },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    // Check if category has children
    if (category._count.children > 0) {
      throw new ConflictException(
        'Cannot delete category with child categories. Please delete or reassign children first.',
      );
    }

    // Check if category has products
    if (category._count.products > 0) {
      throw new ConflictException(
        'Cannot delete category with assigned products. Please remove products from category first.',
      );
    }

    // Soft delete
    await this.prisma.productCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Check for circular reference in parent-child relationship
   */
  private async checkCircularReference(
    tenantId: string,
    categoryId: string,
    newParentId: string,
  ): Promise<boolean> {
    // Walk up the tree from newParentId to see if we encounter categoryId
    let currentId: string | null = newParentId;

    while (currentId) {
      if (currentId === categoryId) {
        return true; // Circular reference detected
      }

      const parent: { parentId: string | null } | null =
        await this.prisma.productCategory.findFirst({
          where: { id: currentId, tenantId, deletedAt: null },
          select: { parentId: true },
        });

      currentId = parent?.parentId ?? null;
    }

    return false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Filter Builder
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Build Prisma where conditions for category queries
   * @param tenantId - Tenant ID to scope the query
   * @param filter - Filter parameters from QueryCategoryDto
   * @returns Prisma.ProductCategoryWhereInput for use in findMany
   */
  private buildCategoryFilter(
    tenantId: string,
    filter: {
      search?: string;
      status?: ProductStatus;
      parentId?: string;
      rootOnly?: boolean;
    },
  ): Prisma.ProductCategoryWhereInput {
    const conditions: Prisma.ProductCategoryWhereInput[] = [];

    // ─────────────────────────────────────────────────────────────
    // 1. Base Conditions (Required)
    // ─────────────────────────────────────────────────────────────
    conditions.push({ tenantId });
    conditions.push({ deletedAt: null });

    // ─────────────────────────────────────────────────────────────
    // 2. Status Filter
    // ─────────────────────────────────────────────────────────────
    if (filter.status) {
      conditions.push({ status: filter.status });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Parent/Root Filter
    // ─────────────────────────────────────────────────────────────
    if (filter.rootOnly) {
      conditions.push({ parentId: null });
    } else if (filter.parentId) {
      conditions.push({ parentId: filter.parentId });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Search (name, description, slug)
    // ─────────────────────────────────────────────────────────────
    if (filter.search) {
      conditions.push({
        OR: [
          { name: { contains: filter.search, mode: 'insensitive' } },
          { description: { contains: filter.search, mode: 'insensitive' } },
          { slug: { contains: filter.search, mode: 'insensitive' } },
        ],
      });
    }

    // ─────────────────────────────────────────────────────────────
    // 5. Combine all conditions with AND
    // ─────────────────────────────────────────────────────────────
    return conditions.length > 0 ? { AND: conditions } : {};
  }
}
