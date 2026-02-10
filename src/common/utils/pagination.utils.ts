import { PaginationQueryDto, SortType } from '../dto/query/pagination';

/**
 * Pagination metadata for API responses.
 * Aligned with GlobalInterceptor expected format.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  take: number;
  total: number;
  skip: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Prisma pagination query parameters.
 */
export interface PrismaPaginationQuery {
  skip: number;
  take: number;
  orderBy?: Record<string, SortType>;
}

/**
 * Result of pagination parsing.
 */
export interface ParsedPagination<T> {
  paginationPrismaQuery: PrismaPaginationQuery;
  paginationData: {
    page: number;
    limit: number;
    skip: number;
  };
  filterParams: T;
}

/**
 * Parses pagination query parameters and returns Prisma-compatible query and filter params.
 * @param queries - Pagination query DTO
 * @returns Parsed pagination data with Prisma query, pagination info, and filter params
 */
export function getPagination<T extends PaginationQueryDto>(
  queries: T,
): ParsedPagination<Omit<T, 'page' | 'limit' | 'sort' | 'sortBy'>> {
  const {
    page = 1,
    limit = 10,
    sort = SortType.DESC, // Default to DESC for "newest first"
    sortBy = 'createdAt', // Default sort field
    ...filterParams
  } = queries;

  // Enforce max limit to prevent abuse
  const safeLimit = Math.min(limit, 100);
  const safePage = Math.max(1, page);

  return {
    paginationPrismaQuery: {
      skip: (safePage - 1) * safeLimit,
      take: safeLimit,
      orderBy: {
        [sortBy]: sort,
      },
    },
    paginationData: {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
    },
    filterParams,
  };
}

/**
 * Generates pagination metadata for API responses.
 * @param options - Pagination parameters
 * @returns Pagination metadata object aligned with interceptor
 */
export function generatePaginationMeta({
  page,
  limit,
  total,
  skip,
}: {
  page: number;
  limit: number;
  total: number;
  skip: number;
}): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    take: limit,
    total,
    skip,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Validates pagination parameters and returns sanitized values.
 * @param page - Page number
 * @param limit - Items per page
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @returns Validated and sanitized pagination parameters
 */
export function validatePagination(
  page: number,
  limit: number,
  maxLimit: number = 100,
): { page: number; limit: number } {
  const sanitizedPage = Math.max(1, Math.floor(page));
  const sanitizedLimit = Math.min(maxLimit, Math.max(1, Math.floor(limit)));

  return {
    page: sanitizedPage,
    limit: sanitizedLimit,
  };
}

/**
 * Calculates offset for cursor-based pagination.
 * @param cursor - Cursor value (typically an ID)
 * @param limit - Items per page
 * @returns Prisma cursor pagination query
 */
export function getCursorPagination(cursor: string | undefined, limit: number) {
  return {
    take: limit,
    ...(cursor && {
      skip: 1,
      cursor: { id: cursor },
    }),
  };
}
