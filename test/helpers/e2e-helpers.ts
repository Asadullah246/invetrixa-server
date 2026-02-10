/**
 * E2E Test Helpers
 *
 * Utility functions for E2E testing with authentication support.
 * These helpers allow tests to authenticate as users and make
 * authenticated requests to protected endpoints.
 */

import { INestApplication, Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { RedisService } from '../../src/redis/redis.service';
import { configureApplication } from '../../src/bootstrap/setup-app';
import * as argon2 from 'argon2';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface TestUser {
  id: string;
  email: string;
  tenantId: string;
  password: string;
}

/**
 * Helper for making authenticated requests with tenant header
 */
export interface AuthenticatedRequest {
  get(url: string): request.Test;
  post(url: string): request.Test;
  patch(url: string): request.Test;
  delete(url: string): request.Test;
  put(url: string): request.Test;
}

export interface AuthenticatedAgent {
  /** Supertest agent with session cookie */
  agent: request.Agent;
  /** Helper that wraps agent with x-tenant-id header */
  request: AuthenticatedRequest;
  /** The test user's info */
  user: TestUser;
  /** Tenant ID for this user */
  tenantId: string;
}

/**
 * Create a request wrapper that automatically includes the tenant header
 */
function createAuthenticatedRequest(
  agent: request.Agent,
  tenantId: string,
): AuthenticatedRequest {
  return {
    get: (url: string) => agent.get(url).set('x-tenant-id', tenantId),
    post: (url: string) => agent.post(url).set('x-tenant-id', tenantId),
    patch: (url: string) => agent.patch(url).set('x-tenant-id', tenantId),
    delete: (url: string) => agent.delete(url).set('x-tenant-id', tenantId),
    put: (url: string) => agent.put(url).set('x-tenant-id', tenantId),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// APP SETUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create and configure a NestJS test application with full middleware stack
 * including session, passport, and validation - matching production setup.
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  // Get required services for full application configuration
  const configService = app.get(ConfigService);
  const redisService = app.get(RedisService);
  const logger = new Logger('E2ETest');

  // Apply FULL configuration including session and passport
  // This is required for authentication to work in E2E tests
  configureApplication({
    app,
    configService,
    redisService,
    logger,
    isProduction: false,
  });

  await app.init();
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA SETUP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a test tenant and user for E2E tests
 */
export async function createTestUserAndTenant(
  prisma: PrismaService,
  suffix: string = '',
): Promise<TestUser> {
  const timestamp = Date.now();
  const email = `e2e-user-${timestamp}${suffix}@test.local`;
  const password = 'TestPassword123!';

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: `E2E Test Tenant ${timestamp}${suffix}`,
      companyType: 'LIMITED_LIABILITY_COMPANY',
      industry: 'TECHNOLOGY',
      businessEmail: `tenant-${timestamp}${suffix}@test.local`,
      businessPhone: '+1234567890',
      establishedYear: '2024',
      status: 'ACTIVE',
    },
  });

  // Create or find the Category module
  let categoryModule = await prisma.moduleRef.findUnique({
    where: { name: 'Category' },
  });
  if (!categoryModule) {
    categoryModule = await prisma.moduleRef.create({
      data: {
        name: 'Category',
        description: 'Category management module',
        actions: [
          'category.view',
          'category.create',
          'category.update',
          'category.delete',
        ],
      },
    });
  }

  // Create a role for E2E tests
  const role = await prisma.role.create({
    data: {
      name: `E2E Test Admin ${timestamp}${suffix}`,
      tenantId: tenant.id,
      rolePermissions: {
        create: [
          {
            moduleRefId: categoryModule.id,
            actions: [
              'category.view',
              'category.create',
              'category.update',
              'category.delete',
            ],
          },
        ],
      },
    },
  });

  // Hash password
  const hashedPassword = await argon2.hash(password);

  // Create user with completed onboarding status
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName: 'E2E',
      lastName: 'TestUser',
      emailVerified: new Date(), // DateTime field, not boolean
      twoFactorEnabled: false,
      onboardingStatus: 'COMPLETED', // Required to access protected endpoints
    },
  });

  // Create user assignment to tenant
  await prisma.userAssignment.create({
    data: {
      userId: user.id,
      tenantId: tenant.id,
      roleId: role.id,
    },
  });

  return {
    id: user.id,
    email,
    tenantId: tenant.id,
    password,
  };
}

/**
 * Login a test user and return an authenticated agent
 */
export async function loginTestUser(
  app: INestApplication,
  testUser: TestUser,
): Promise<AuthenticatedAgent> {
  const agent = request.agent(app.getHttpServer() as App);

  // Login to establish session
  // Note: App uses global prefix '/api' and versioning '/v1'
  const loginResponse = await agent
    .post('/api/v1/auth/login')
    .send({
      email: testUser.email,
      password: testUser.password,
    })
    .expect(200);

  const loginBody = loginResponse.body as { success: boolean };
  if (!loginBody.success) {
    throw new Error(`Login failed: ${JSON.stringify(loginResponse.body)}`);
  }

  return {
    agent,
    request: createAuthenticatedRequest(agent, testUser.tenantId),
    user: testUser,
    tenantId: testUser.tenantId,
  };
}

/**
 * Clean up test data after E2E tests
 */
export async function cleanupTestData(
  prisma: PrismaService,
  tenantId: string,
): Promise<void> {
  try {
    // Find users associated with this tenant via userAssignments
    const userAssignments = await prisma.userAssignment.findMany({
      where: { tenantId },
      select: { userId: true },
    });
    const userIds = userAssignments.map((ua) => ua.userId);

    // Delete in order of dependencies
    await prisma.productCategory.deleteMany({ where: { tenantId } });
    await prisma.userAssignment.deleteMany({ where: { tenantId } });
    await prisma.role.deleteMany({ where: { tenantId } });

    // Delete users found through userAssignments
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await prisma.tenant.delete({ where: { id: tenantId } });
  } catch (error) {
    console.warn('E2E cleanup warning:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST RESPONSE HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard API response structure
 */
export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

/**
 * Paginated API response structure
 */
export interface PaginatedApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
