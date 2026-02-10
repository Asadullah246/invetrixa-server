import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  Prisma,
  ProductStatus,
  ProductType,
  StockReferenceType,
} from 'generated/prisma/client';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SlugService } from '@/common/utils/slug.utils';
import { SkuService, generateSkuFromName } from '@/common/utils/sku.utils';
import { isUUID } from '@/common/utils/uuid.utils';
import { getPagination, generatePaginationMeta } from '@/common/utils';
import {
  CreateProductDto,
  UpdateProductDto,
  QueryProductDto,
  InitialStockInput,
} from './dto';
import { UnitTypesService } from '../tenants/services/unit-types.service';
import { MovementService } from '../stock/services';
import { CategoryService } from '../category/category.service';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private slugService: SlugService,
    private skuService: SkuService,
    private unitTypesService: UnitTypesService,
    private movementService: MovementService,
    private categoryService: CategoryService,
  ) {}

  /**
   * Ensure the unit type exists in tenant's unit types list
   * If not, auto-add it to the list
   */
  private async ensureUnitTypeExists(
    tenantId: string,
    unitType: string,
  ): Promise<void> {
    const existingTypes = await this.unitTypesService.getUnitTypes(tenantId);

    if (!existingTypes.values.includes(unitType)) {
      // Add the new unit type to the tenant's list
      await this.unitTypesService.addUnitTypes(tenantId, [unitType]);
    }
  }

  /**
   * Create initial stock for a product
   * Uses MovementService to create stock movements with ADJUSTMENT reference type
   */
  private async createInitialStock(
    tenantId: string,
    userId: string,
    productId: string,
    initialStockItems: InitialStockInput[],
  ): Promise<void> {
    if (!initialStockItems?.length) {
      return;
    }

    // Group stock items by location for efficient bulk creation
    const stockByLocation = new Map<string, InitialStockInput[]>();
    for (const item of initialStockItems) {
      const existing = stockByLocation.get(item.locationId) || [];
      existing.push(item);
      stockByLocation.set(item.locationId, existing);
    }

    // Create stock movements for each location
    for (const [locationId, items] of stockByLocation) {
      await this.movementService.stockIn(tenantId, userId, {
        locationId,
        referenceType: StockReferenceType.ADJUSTMENT,
        referenceId: productId,
        note: 'Initial stock on product creation',
        items: items.map((item) => ({
          productId,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      });
    }
  }

  /**
   * Create a new product
   */
  async create(tenantId: string, userId: string, dto: CreateProductDto) {
    // Generate or validate SKU
    const baseSku = dto.sku ?? generateSkuFromName(dto.name);
    const sku = await this.skuService.createSku({ tenantId, baseSku });

    // Ensure unit type exists in tenant's list (auto-add if not)
    await this.ensureUnitTypeExists(tenantId, dto.unitType);

    // Validate categories (required - at least one)
    await this.categoryService.validateCategoryIds(tenantId, dto.categoryIds);

    // Check for explicit variants
    if (dto.variants?.length) {
      return this.createWithExplicitVariants(tenantId, userId, dto, sku);
    }

    // Simple product creation (no variants)
    return this.createSimpleProduct(tenantId, userId, dto, sku);
  }

  /**
   * Create simple product without variants
   */
  private async createSimpleProduct(
    tenantId: string,
    userId: string,
    dto: CreateProductDto,
    sku: string,
  ) {
    const slug = await this.slugService.createSlug({
      model: 'product',
      tenantId,
      slug: dto.slug,
      name: dto.name,
    });

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        sku,
        barcode: dto.barcode,
        qrcode: dto.qrcode,
        shortDescription: dto.shortDescription,
        description: dto.description as Prisma.InputJsonValue,
        taxRate: dto.taxRate ?? 0,
        weight: dto.weight,
        dimensions: dto.dimensions as Prisma.InputJsonValue,
        featureImage: dto.featureImage,
        images: dto.images ?? [],
        video: dto.video,
        status: dto.status ?? ProductStatus.DRAFT,
        isFeatured: dto.isFeatured ?? false,
        tags: dto.tags ?? [],
        features: dto.features as Prisma.InputJsonValue,
        reorderLevel: dto.reorderLevel ?? 0,
        unitType: dto.unitType,
        productType: ProductType.SIMPLE,
        // Pricing fields
        pricingMethod: dto.pricingMethod,
        markupType: dto.markupType,
        markupValue: dto.markupValue,
        minSellingPrice: dto.minSellingPrice,
        maxSellingPrice: dto.maxSellingPrice,
        tenantId,
        categories: dto.categoryIds.length
          ? { create: dto.categoryIds.map((categoryId) => ({ categoryId })) }
          : undefined,
      },
      include: {
        categories: {
          include: {
            category: { select: { id: true, name: true, slug: true } },
          },
        },
        _count: { select: { variants: true } },
      },
    });

    // Create initial stock if provided
    if (dto.initialStock?.length) {
      await this.createInitialStock(
        tenantId,
        userId,
        product.id,
        dto.initialStock,
      );
    }

    return {
      id: product.id,
      name: product.name,
      slug: product.slug ?? '',
      sku: product.sku,
    };
  }

  /**
   * Create product with explicit variants
   */
  private async createWithExplicitVariants(
    tenantId: string,
    userId: string,
    dto: CreateProductDto,
    sku: string,
  ) {
    const variants = dto.variants!;

    // Generate unique SKUs for all variants (even user-provided ones)
    const variantSkus: string[] = [];
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      // If SKU provided, ensure it's unique; if not, generate from parent + attributes
      const variantSku = v.sku
        ? await this.skuService.createSku({ tenantId, baseSku: v.sku })
        : await this.skuService.createVariantSku({
            tenantId,
            parentSku: sku,
            attributes: v.attributes,
            index: i,
          });
      variantSkus.push(variantSku);
      variants[i] = { ...v, sku: variantSku };
    }

    // Create parent slug
    const parentSlug = await this.slugService.createSlug({
      model: 'product',
      tenantId,
      slug: dto.slug,
      name: dto.name,
    });

    // Use transaction for atomicity
    const transactionResult = await this.prisma.$transaction(async (tx) => {
      // 1. Create parent product with aggregated attributes (all values)
      const parentAttributeValues = this.aggregateAttributeValues(variants);

      const parent = await tx.product.create({
        data: {
          name: dto.name,
          slug: parentSlug,
          sku,
          barcode: dto.barcode,
          qrcode: dto.qrcode,
          shortDescription: dto.shortDescription,
          description: dto.description as Prisma.InputJsonValue,
          taxRate: dto.taxRate ?? 0,
          weight: dto.weight,
          dimensions: dto.dimensions as Prisma.InputJsonValue,
          featureImage: dto.featureImage,
          images: dto.images ?? [],
          video: dto.video,
          status: dto.status ?? ProductStatus.DRAFT,
          isFeatured: dto.isFeatured ?? false,
          tags: dto.tags ?? [],
          features: dto.features as Prisma.InputJsonValue,
          reorderLevel: dto.reorderLevel ?? 0,
          unitType: dto.unitType,
          productType: ProductType.VARIABLE,
          // Pricing fields
          pricingMethod: dto.pricingMethod,
          markupType: dto.markupType,
          markupValue: dto.markupValue,
          minSellingPrice: dto.minSellingPrice,
          maxSellingPrice: dto.maxSellingPrice,
          tenantId,
          categories: {
            create: dto.categoryIds.map((categoryId) => ({ categoryId })),
          },
          // Create aggregated attributes for parent (all values)
          attributeValues: parentAttributeValues.length
            ? { create: parentAttributeValues }
            : undefined,
        },
      });

      // 2. Generate slugs for all variants
      const variantSlugs: string[] = [];
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const variantName =
          v.name ??
          (v.attributes?.length
            ? `${dto.name} - ${v.attributes.map((a) => a.values[0]).join(' ')}`
            : `${dto.name} - ${variantSkus[i]}`);
        const variantSlug = await this.slugService.createSlug({
          model: 'product',
          tenantId,
          name: variantName,
        });
        variantSlugs.push(variantSlug);
      }

      // 3. Prepare variant data for bulk creation
      const variantData = variants.map((v, index) => {
        const variantName =
          v.name ??
          (v.attributes?.length
            ? `${dto.name} - ${v.attributes.map((a) => a.values[0]).join(' ')}`
            : `${dto.name} - ${variantSkus[index]}`);

        return {
          name: variantName,
          slug: variantSlugs[index],
          sku: variantSkus[index],
          barcode: v.barcode ?? dto.barcode,
          qrcode: dto.qrcode,
          shortDescription: dto.shortDescription,
          description: dto.description as Prisma.InputJsonValue,
          taxRate: dto.taxRate ?? 0,
          weight: v.weight ?? dto.weight,
          dimensions: (v.dimensions ?? dto.dimensions) as Prisma.InputJsonValue,
          featureImage: v.featureImage ?? dto.featureImage,
          images: v.images ?? dto.images ?? [],
          video: dto.video,
          status: dto.status ?? ProductStatus.DRAFT,
          isFeatured: false,
          tags: dto.tags ?? [],
          features: dto.features as Prisma.InputJsonValue,
          reorderLevel: dto.reorderLevel ?? 0,
          unitType: dto.unitType,
          productType: ProductType.VARIANT,
          // Pricing fields (inherit from parent)
          pricingMethod: dto.pricingMethod,
          markupType: dto.markupType,
          markupValue: dto.markupValue,
          minSellingPrice: dto.minSellingPrice,
          maxSellingPrice: dto.maxSellingPrice,
          parentId: parent.id,
          tenantId,
        };
      });

      // 4. Bulk create all variants
      await tx.product.createMany({ data: variantData });

      // 5. Fetch created variants to get their IDs
      const createdVariants = await tx.product.findMany({
        where: { sku: { in: variantSkus }, tenantId, parentId: parent.id },
        select: { id: true, sku: true, name: true },
      });

      // Create SKU to ID mapping for efficient lookup
      const skuToId = new Map(createdVariants.map((v) => [v.sku, v.id]));

      // 6. Prepare and bulk create product attribute values
      const productAttributeValueData: Array<{
        productId: string;
        key: string;
        values: string[];
      }> = [];

      for (let i = 0; i < variants.length; i++) {
        const variantInput = variants[i];
        const productId = skuToId.get(variantSkus[i]);
        if (productId && variantInput.attributes?.length) {
          for (const attr of variantInput.attributes) {
            productAttributeValueData.push({
              productId,
              key: attr.key,
              values: attr.values,
            });
          }
        }
      }

      if (productAttributeValueData.length > 0) {
        await tx.productAttributeValue.createMany({
          data: productAttributeValueData,
        });
      }

      // 7. Bulk assign categories to all variants
      if (dto.categoryIds?.length) {
        const categoryData = createdVariants.flatMap((variant) =>
          dto.categoryIds.map((categoryId) => ({
            productId: variant.id,
            categoryId,
          })),
        );
        await tx.productCategoryProduct.createMany({ data: categoryData });
      }

      return {
        parent,
        createdVariants,
        variantSkus,
      };
    });

    // 7. Create initial stock for each variant (outside transaction)
    for (let i = 0; i < variants.length; i++) {
      const variantInput = variants[i];
      const variantId = transactionResult.createdVariants.find(
        (v) => v.sku === transactionResult.variantSkus[i],
      )?.id;

      if (variantId && variantInput.initialStock?.length) {
        await this.createInitialStock(
          tenantId,
          userId,
          variantId,
          variantInput.initialStock,
        );
      }
    }

    const parent = transactionResult.parent;
    return {
      id: parent.id,
      name: parent.name,
      slug: parent.slug ?? '',
      sku: parent.sku,
      variants: transactionResult.createdVariants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
      })),
    };
  }

  /**
   * Aggregate attribute values from all variants for parent product
   * Parent gets all possible values for each attribute key
   */
  private aggregateAttributeValues(
    variants: Array<{ attributes?: Array<{ key: string; values: string[] }> }>,
  ): Array<{ key: string; values: string[] }> {
    const valuesByKey = new Map<string, Set<string>>();

    for (const variant of variants) {
      for (const attr of variant.attributes ?? []) {
        const existing = valuesByKey.get(attr.key) ?? new Set();
        for (const val of attr.values) {
          existing.add(val);
        }
        valuesByKey.set(attr.key, existing);
      }
    }

    return Array.from(valuesByKey.entries()).map(([key, values]) => ({
      key,
      values: Array.from(values),
    }));
  }

  /**
   * Get all products with filtering and pagination
   * Excludes parent (VARIABLE) products by default - only shows sellable products
   */
  async findAll(tenantId: string, query: QueryProductDto) {
    const { paginationPrismaQuery, paginationData, filterParams } =
      getPagination(query);

    // Build where clause using filter builder
    const where = this.buildProductFilter(tenantId, filterParams);

    // By default, exclude parent (VARIABLE) products - only show sellable products
    // Use parentOnly=true to get only parent (VARIABLE) products
    if (String(filterParams['parentOnly']) !== 'true') {
      where.productType = { in: [ProductType.SIMPLE, ProductType.VARIANT] };
    }

    // Execute queries in parallel
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        ...paginationPrismaQuery,
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          barcode: true,
          qrcode: true,
          taxRate: true,
          featureImage: true,
          status: true,
          isFeatured: true,
          reorderLevel: true,
          unitType: true,
          productType: true,
          pricingMethod: true,
          markupType: true,
          markupValue: true,
          minSellingPrice: true,
          maxSellingPrice: true,
          createdAt: true,
          updatedAt: true,
          categories: {
            select: {
              category: {
                select: { id: true, name: true },
              },
            },
          },
          _count: {
            select: { variants: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    // Transform response - flatten categories and convert Decimals to numbers
    const data = products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      qrcode: product.qrcode,
      taxRate: product.taxRate,
      featureImage: product.featureImage,
      status: product.status,
      isFeatured: product.isFeatured,
      reorderLevel: product.reorderLevel,
      unitType: product.unitType,
      productType: product.productType,
      pricingMethod: product.pricingMethod,
      markupType: product.markupType,
      markupValue: product.markupValue ? Number(product.markupValue) : null,
      minSellingPrice: product.minSellingPrice
        ? Number(product.minSellingPrice)
        : null,
      maxSellingPrice: product.maxSellingPrice
        ? Number(product.maxSellingPrice)
        : null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      categories: product.categories.map((c) => c.category),
      variants: product._count.variants,
    }));

    return {
      meta: generatePaginationMeta({
        ...paginationData,
        total,
      }),
      data,
    };
  }

  /**
   * Get a single product by ID or slug
   */
  async findOne(tenantId: string, identifier: string) {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
      ...(isUUID(identifier) ? { id: identifier } : { slug: identifier }),
    };

    const product = await this.prisma.product.findFirst({
      where,
      include: {
        parent: {
          select: { id: true, name: true, slug: true },
        },
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        attributeValues: {
          select: { key: true, values: true },
        },
        _count: {
          select: { variants: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    // Transform response - convert Decimals to numbers
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      barcode: product.barcode,
      qrcode: product.qrcode,
      shortDescription: product.shortDescription,
      description: product.description,
      taxRate: product.taxRate,
      weight: product.weight,
      dimensions: product.dimensions,
      featureImage: product.featureImage,
      images: product.images,
      video: product.video,
      status: product.status,
      isFeatured: product.isFeatured,
      tags: product.tags,
      features: product.features,
      reorderLevel: product.reorderLevel,
      unitType: product.unitType,
      productType: product.productType,
      pricingMethod: product.pricingMethod,
      markupType: product.markupType,
      markupValue: product.markupValue ? Number(product.markupValue) : null,
      minSellingPrice: product.minSellingPrice
        ? Number(product.minSellingPrice)
        : null,
      maxSellingPrice: product.maxSellingPrice
        ? Number(product.maxSellingPrice)
        : null,
      tenantId: product.tenantId,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      parent: product.parent,
      categories: product.categories.map((c) => c.category),
      variants: product._count.variants,
      attributes: product.attributeValues.map((a) => ({
        key: a.key,
        values: a.values,
      })),
    };
  }

  /**
   * Update a product
   */
  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    // Check product exists
    const existing = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, sku: true, name: true },
    });

    if (!existing) {
      throw new NotFoundException('Product not found.');
    }

    // Sanitize and check SKU uniqueness if changing
    let sku: string | undefined;
    if (dto.sku !== undefined && dto.sku !== existing.sku) {
      sku = await this.skuService.createSku({
        tenantId,
        baseSku: dto.sku,
        excludeId: id,
      });
    }

    // Generate new slug if name or slug changed
    let slug: string | undefined;
    if (dto.slug !== undefined || dto.name) {
      slug = await this.slugService.createSlug({
        model: 'product',
        tenantId,
        slug: dto.slug,
        name: dto.name,
        excludeId: id,
      });
    }

    // Build update data
    const updateData: Prisma.ProductUpdateInput = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (slug !== undefined) updateData.slug = slug;
    if (sku !== undefined) updateData.sku = sku;
    if (dto.barcode !== undefined) updateData.barcode = dto.barcode;
    if (dto.qrcode !== undefined) updateData.qrcode = dto.qrcode;
    if (dto.shortDescription !== undefined)
      updateData.shortDescription = dto.shortDescription;
    if (dto.description !== undefined)
      updateData.description = dto.description as Prisma.InputJsonValue;
    if (dto.taxRate !== undefined) updateData.taxRate = dto.taxRate;
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.dimensions !== undefined)
      updateData.dimensions = dto.dimensions as Prisma.InputJsonValue;
    if (dto.featureImage !== undefined)
      updateData.featureImage = dto.featureImage;
    if (dto.images !== undefined) updateData.images = dto.images;
    if (dto.video !== undefined) updateData.video = dto.video;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.features !== undefined)
      updateData.features = dto.features as Prisma.InputJsonValue;
    if (dto.reorderLevel !== undefined)
      updateData.reorderLevel = dto.reorderLevel;
    if (dto.unitType !== undefined) updateData.unitType = dto.unitType;

    // Pricing fields
    if (dto.pricingMethod !== undefined)
      updateData.pricingMethod = dto.pricingMethod;
    if (dto.markupType !== undefined) updateData.markupType = dto.markupType;
    if (dto.markupValue !== undefined) updateData.markupValue = dto.markupValue;
    if (dto.minSellingPrice !== undefined)
      updateData.minSellingPrice = dto.minSellingPrice;
    if (dto.maxSellingPrice !== undefined)
      updateData.maxSellingPrice = dto.maxSellingPrice;

    // Use transaction for category updates + product update
    const product = await this.prisma.$transaction(async (tx) => {
      // Handle category updates
      if (dto.categoryIds !== undefined) {
        // Delete existing and create new
        await tx.productCategoryProduct.deleteMany({
          where: { productId: id },
        });

        if (dto.categoryIds.length) {
          await tx.productCategoryProduct.createMany({
            data: dto.categoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
            })),
          });
        }
      }

      // Update product
      return tx.product.update({
        where: { id },
        data: updateData,
      });
    });

    // Transform Decimal fields to numbers
    return {
      ...product,
      markupValue: product.markupValue ? Number(product.markupValue) : null,
      minSellingPrice: product.minSellingPrice
        ? Number(product.minSellingPrice)
        : null,
      maxSellingPrice: product.maxSellingPrice
        ? Number(product.maxSellingPrice)
        : null,
    };
  }

  /**
   * Soft delete a product
   */
  async remove(tenantId: string, id: string): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        _count: {
          select: { variants: { where: { deletedAt: null } } },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    // Check for active variants
    if (product._count.variants > 0) {
      throw new ConflictException(
        'Cannot delete product with active variants. Delete variants first.',
      );
    }

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Build filter for product queries
   */
  private buildProductFilter(
    tenantId: string,
    filterParams: Record<string, unknown>,
  ): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Status filter
    if (filterParams.status) {
      where.status = filterParams.status as ProductStatus;
    }

    // Featured filter
    if (filterParams.isFeatured !== undefined) {
      where.isFeatured = filterParams.isFeatured === 'true';
    }

    // Category filter
    if (filterParams.categoryId) {
      where.categories = {
        some: {
          categoryId: filterParams.categoryId as string,
        },
      };
    }

    // Parent filter (for variants)
    if (filterParams.parentId) {
      where.parentId = filterParams.parentId as string;
    }

    // Search filter
    if (filterParams.search) {
      const searchTerm = filterParams.search as string;
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { sku: { contains: searchTerm, mode: 'insensitive' } },
        { shortDescription: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Unit type filter
    if (filterParams.unitType) {
      where.unitType = filterParams.unitType as string;
    }

    // Attribute filter - find products with specific attribute value
    if (filterParams.attributeKey && filterParams.attributeValue) {
      where.attributeValues = {
        some: {
          key: filterParams.attributeKey as string,
          values: { has: filterParams.attributeValue as string },
        },
      };
    }

    // Parent only filter - show only parent (VARIABLE) products
    // Default: show only sellable products (SIMPLE + VARIANT)
    if (String(filterParams.parentOnly) === 'true') {
      where.productType = ProductType.VARIABLE;
    }

    return where;
  }
}
