/**
 * Test Data Factory
 *
 * Provides factory functions to create consistent test data.
 * Use these to generate realistic mock data for tests.
 */

import { ProductStatus } from 'generated/prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// IDs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a mock UUID for testing
 * Uses a deterministic format for easy identification in tests
 */
export function mockUUID(suffix: number | string = 1): string {
  const padded = String(suffix).padStart(4, '0');
  return `00000000-0000-0000-0000-0000000${padded}`;
}

/**
 * Common test IDs
 */
export const TEST_IDS = {
  TENANT_ID: mockUUID('0001'),
  USER_ID: mockUUID('0002'),
  LOCATION_ID: mockUUID('0003'),
  CATEGORY_ID: mockUUID('0010'),
  CATEGORY_ID_2: mockUUID('0011'),
  PARENT_CATEGORY_ID: mockUUID('0020'),
  PRODUCT_ID: mockUUID('0100'),
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Category Test Data
// ─────────────────────────────────────────────────────────────────────────────

export interface MockCategoryOptions {
  id?: string;
  name?: string;
  slug?: string;
  description?: string;
  status?: ProductStatus;
  parentId?: string | null;
  tenantId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

/**
 * Create a mock category object
 */
export function createMockCategory(options: MockCategoryOptions = {}) {
  const now = new Date();
  return {
    id: options.id ?? TEST_IDS.CATEGORY_ID,
    name: options.name ?? 'Electronics',
    slug: options.slug ?? 'electronics',
    description: options.description ?? 'Electronic devices and gadgets',
    image: null,
    status: options.status ?? ProductStatus.ACTIVE,
    parentId: options.parentId ?? null,
    tenantId: options.tenantId ?? TEST_IDS.TENANT_ID,
    createdAt: options.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
    deletedAt: options.deletedAt ?? null,
  };
}

/**
 * Create a mock category with parent relation included
 */
export function createMockCategoryWithParent(
  options: MockCategoryOptions & { parent?: MockCategoryOptions } = {},
) {
  const category = createMockCategory(options);

  return {
    ...category,
    parent: options.parent
      ? {
          id: options.parent.id ?? TEST_IDS.PARENT_CATEGORY_ID,
          name: options.parent.name ?? 'Parent Category',
          slug: options.parent.slug ?? 'parent-category',
        }
      : null,
  };
}

/**
 * Create a mock category with counts (for list responses)
 */
export function createMockCategoryWithCounts(
  options: MockCategoryOptions & {
    childrenCount?: number;
    productsCount?: number;
  } = {},
) {
  const category = createMockCategoryWithParent(options);

  return {
    ...category,
    _count: {
      children: options.childrenCount ?? 0,
      products: options.productsCount ?? 0,
    },
  };
}

/**
 * Create a mock category with full detail (for findOne responses)
 */
export function createMockCategoryDetail(
  options: MockCategoryOptions & {
    children?: MockCategoryOptions[];
    productsCount?: number;
  } = {},
) {
  const category = createMockCategoryWithParent(options);

  return {
    ...category,
    children:
      options.children?.map((child) => ({
        id: child.id ?? mockUUID(Math.random() * 1000),
        name: child.name ?? 'Child Category',
        slug: child.slug ?? 'child-category',
        status: child.status ?? ProductStatus.ACTIVE,
      })) ?? [],
    _count: {
      products: options.productsCount ?? 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Query/DTO Test Data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a mock QueryCategoryDto
 */
export function createMockQueryCategory(
  options: {
    page?: number;
    limit?: number;
    search?: string;
    status?: ProductStatus;
    parentId?: string;
    rootOnly?: boolean;
  } = {},
) {
  return {
    page: options.page ?? 1,
    limit: options.limit ?? 10,
    search: options.search,
    status: options.status,
    parentId: options.parentId,
    rootOnly: options.rootOnly,
  };
}

/**
 * Create a mock CreateCategoryDto
 */
export function createMockCreateCategoryDto(
  options: {
    name?: string;
    slug?: string;
    description?: string;
    status?: ProductStatus;
    parentId?: string;
  } = {},
) {
  return {
    name: options.name ?? 'New Category',
    slug: options.slug,
    description: options.description,
    status: options.status,
    parentId: options.parentId,
  };
}

/**
 * Create a mock UpdateCategoryDto
 */
export function createMockUpdateCategoryDto(
  options: {
    name?: string;
    slug?: string;
    description?: string;
    status?: ProductStatus;
    parentId?: string;
  } = {},
) {
  return {
    name: options.name,
    slug: options.slug,
    description: options.description,
    status: options.status,
    parentId: options.parentId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Test Data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create mock pagination meta
 */
export function createMockPaginationMeta(
  options: {
    page?: number;
    limit?: number;
    total?: number;
  } = {},
) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 10;
  const total = options.total ?? 1;
  const totalPages = Math.ceil(total / limit);

  return {
    currentPage: page,
    itemsPerPage: limit,
    totalItems: total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
