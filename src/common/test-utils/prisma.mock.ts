/**
 * Prisma Mock Factory
 *
 * Provides reusable mock factories for PrismaService in unit tests.
 * All database methods are mocked with Jest functions.
 *
 * @example
 * const mockPrisma = createMockPrismaService();
 * mockPrisma.productCategory.findMany.mockResolvedValue([...]);
 */

import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * Type for a deeply mocked Prisma model
 */
type MockPrismaModel = {
  findMany: jest.Mock;
  findFirst: jest.Mock;
  findUnique: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
  upsert: jest.Mock;
  aggregate: jest.Mock;
};

/**
 * Create a mock for a single Prisma model
 */
function createMockModel(): MockPrismaModel {
  return {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    upsert: jest.fn(),
    aggregate: jest.fn(),
  };
}

/**
 * Type for the mocked PrismaService
 */
export type MockPrismaService = {
  // Core models
  tenant: MockPrismaModel;
  user: MockPrismaModel;
  location: MockPrismaModel;
  productCategory: MockPrismaModel;
  product: MockPrismaModel;
  supplier: MockPrismaModel;
  stock: MockPrismaModel;
  stockMovement: MockPrismaModel;
  stockTransfer: MockPrismaModel;
  customer: MockPrismaModel;

  // Transaction support
  $transaction: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
};

/**
 * Create a fully mocked PrismaService
 *
 * @returns A mocked PrismaService with all methods as Jest mocks
 *
 * @example
 * const mockPrisma = createMockPrismaService();
 *
 * // Setup return value
 * mockPrisma.productCategory.findMany.mockResolvedValue([
 *   { id: '1', name: 'Electronics' }
 * ]);
 *
 * // Use in test module
 * const module = await Test.createTestingModule({
 *   providers: [
 *     CategoryService,
 *     { provide: PrismaService, useValue: mockPrisma },
 *   ],
 * }).compile();
 */
export function createMockPrismaService(): MockPrismaService {
  return {
    // Core models
    tenant: createMockModel(),
    user: createMockModel(),
    location: createMockModel(),
    productCategory: createMockModel(),
    product: createMockModel(),
    supplier: createMockModel(),
    stock: createMockModel(),
    stockMovement: createMockModel(),
    stockTransfer: createMockModel(),
    customer: createMockModel(),

    // Transaction - executes the callback with the mock itself
    $transaction: jest.fn((callback: unknown): Promise<unknown> => {
      if (typeof callback === 'function') {
        return Promise.resolve(
          (callback as (prisma: MockPrismaService) => unknown)(
            createMockPrismaService(),
          ),
        );
      }
      return Promise.resolve(callback);
    }),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };
}

/**
 * Get the mocked PrismaService typed correctly for use in tests
 */
export function asMockPrisma(prisma: PrismaService): MockPrismaService {
  return prisma as unknown as MockPrismaService;
}
