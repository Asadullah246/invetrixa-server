# 🧪 Testing Guide - AMSI CRM Server

> A comprehensive guide for testing the invetrixa-server application.
> Created: 2026-01-28

---

## 📋 Table of Contents

1. [Testing Order (Which First?)](#testing-order)
2. [Test Types Explained](#test-types-explained)
3. [Step-by-Step Process](#step-by-step-process)
4. [Commands Reference](#commands-reference)
5. [Testing Checklist](#testing-checklist)

---

## 🎯 Testing Order (Which First?) {#testing-order}

Follow this order:

```
1️⃣ Unit Tests (Start Here!)
      ↓
2️⃣ Integration Tests
      ↓
3️⃣ E2E Tests
      ↓
4️⃣ Contract/Schema Tests (Optional)
```

### Why This Order?

| Order | Test Type             | Why First/Later                                            |
| ----- | --------------------- | ---------------------------------------------------------- |
| 1️⃣    | **Unit Tests**        | Fastest to write, instant feedback, teaches code structure |
| 2️⃣    | **Integration Tests** | Builds on unit tests, tests DB interactions                |
| 3️⃣    | **E2E Tests**         | Tests full flow, requires running app                      |
| 4️⃣    | **Contract Tests**    | Only needed for API versioning/external consumers          |

---

## 🔍 Test Types Explained {#test-types-explained}

### 1️⃣ Unit Tests

**What:** Test a single function/class in complete isolation.

**Characteristics:**

- ✅ Fastest to run (milliseconds)
- ✅ No database needed
- ✅ No external services needed
- ⚠️ All dependencies are MOCKED

**What to Mock:**

- PrismaService (database)
- RedisService (cache)
- External APIs
- Other services

**File Pattern:** `*.spec.ts` (co-located with source file)

**Example Structure:**

```typescript
// src/modules/category/category.service.spec.ts

import { Test } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    // Create mock
    const mockPrisma = {
      category: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(CategoryService);
    prisma = module.get(PrismaService);
  });

  describe('findAll', () => {
    it('should return array of categories', async () => {
      // Arrange
      const mockCategories = [{ id: '1', name: 'Test' }];
      prisma.category.findMany.mockResolvedValue(mockCategories);

      // Act
      const result = await service.findAll(tenantId);

      // Assert
      expect(result).toEqual(mockCategories);
      expect(prisma.category.findMany).toHaveBeenCalled();
    });
  });
});
```

---

### 2️⃣ Integration Tests

**What:** Test service + real database together.

**Characteristics:**

- ⏱️ Slower (needs DB connection)
- ✅ Tests real Prisma queries
- ✅ Tests database constraints
- ⚠️ Needs test database

**What's Real vs Mocked:**

- ✅ Real: Database (PostgreSQL), Prisma
- ❌ Mocked: External APIs, Redis (optional)

**File Pattern:** `*.integration.spec.ts` or in `test/integration/` folder

**Example Structure:**

```typescript
// test/integration/category.integration.spec.ts

import { Test } from '@nestjs/testing';
import { CategoryService } from '@/modules/category/category.service';
import { PrismaService } from '@/common/prisma/prisma.service';

describe('CategoryService (Integration)', () => {
  let service: CategoryService;
  let prisma: PrismaService;
  let testTenantId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [CategoryService, PrismaService],
    }).compile();

    service = module.get(CategoryService);
    prisma = module.get(PrismaService);

    // Setup: Create test tenant
    const tenant = await prisma.tenant.create({
      data: { name: 'Test Tenant', subdomain: 'test' },
    });
    testTenantId = tenant.id;
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    await prisma.category.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } });
    await prisma.$disconnect();
  });

  describe('create', () => {
    it('should create category in database', async () => {
      // Act
      const result = await service.create(testTenantId, {
        name: 'Electronics',
      });

      // Assert - Check actual DB
      const found = await prisma.category.findUnique({
        where: { id: result.id },
      });
      expect(found).toBeDefined();
      expect(found.name).toBe('Electronics');
    });
  });
});
```

---

### 3️⃣ E2E (End-to-End) Tests

**What:** Test complete HTTP request → response cycle.

**Characteristics:**

- ⏱️ Slowest (full app bootstrap)
- ✅ Tests real API endpoints
- ✅ Tests authentication/authorization
- ✅ Tests request validation
- ⚠️ Needs running app + database

**What's Real vs Mocked:**

- ✅ Real: Everything (App, DB, Auth)
- ❌ Mocked: External APIs only

**File Pattern:** `*.e2e-spec.ts` in `test/` folder

**Example Structure:**

```typescript
// test/category.e2e-spec.ts

import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Category (E2E)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    // Login to get auth token
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password' });
    authToken = loginRes.body.data.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /categories', () => {
    it('should create category when authenticated', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'New Category' })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('New Category');
    });

    it('should return 401 when not authenticated', async () => {
      await request(app.getHttpServer())
        .post('/categories')
        .send({ name: 'New Category' })
        .expect(401);
    });
  });
});
```

---

### 4️⃣ Contract/Schema Tests (Optional)

**What:** Validate API response shapes match expected contracts.

**When to Use:**

- When you have external API consumers
- For API versioning
- For OpenAPI/Swagger validation

**Example:**

```typescript
// test/contracts/category.contract.spec.ts

import { z } from 'zod';

const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

describe('Category API Contract', () => {
  it('GET /categories should return valid schema', async () => {
    const response = await fetch('/api/categories');
    const data = await response.json();

    // Validate each item matches contract
    data.items.forEach((item) => {
      expect(() => CategorySchema.parse(item)).not.toThrow();
    });
  });
});
```

---

## 📝 Step-by-Step Process {#step-by-step-process}

### Step 1: Setup Test Database

```bash
# 1. Create test database (in docker-compose or manually)
docker exec -it invetrixa-postgres psql -U postgres -c "CREATE DATABASE invetrixa_test;"

# 2. Create .env.test file
cp .env.development .env.test

# 3. Update DATABASE_URL in .env.test
DATABASE_URL="postgresql://postgres:password@localhost:5432/invetrixa_test"

# 4. Run migrations on test database
DATABASE_URL="postgresql://postgres:password@localhost:5432/invetrixa_test" pnpm exec prisma migrate deploy
```

### Step 2: Write Your First Unit Test

```bash
# 1. Pick a simple module (e.g., category)
cd src/modules/category

# 2. Create or update the spec file
# category.service.spec.ts

# 3. Run the test
pnpm test category.service.spec.ts

# 4. Watch mode for development
pnpm test:watch category.service.spec.ts
```

### Step 3: Write Integration Tests

```bash
# 1. Create integration test folder
mkdir -p test/integration

# 2. Create integration test file
touch test/integration/category.integration.spec.ts

# 3. Run with test database
DATABASE_URL="postgresql://postgres:password@localhost:5432/invetrixa_test" pnpm test:e2e
```

### Step 4: Write E2E Tests

```bash
# 1. E2E tests go in test/ folder
touch test/category.e2e-spec.ts

# 2. Run E2E tests
pnpm test:e2e
```

---

## 💻 Commands Reference {#commands-reference}

### Running Tests

| Command                | Description                    |
| ---------------------- | ------------------------------ |
| `pnpm test`            | Run all unit tests             |
| `pnpm test:watch`      | Run tests in watch mode        |
| `pnpm test:cov`        | Run tests with coverage report |
| `pnpm test:debug`      | Run tests in debug mode        |
| `pnpm test:e2e`        | Run E2E tests                  |
| `pnpm test <filename>` | Run specific test file         |

### Useful Test Patterns

```bash
# Run specific file
pnpm test category.service.spec.ts

# Run tests matching pattern
pnpm test --testNamePattern="should create"

# Run tests in specific directory
pnpm test --testPathPattern="modules/category"

# Run with verbose output
pnpm test --verbose

# Update snapshots
pnpm test --updateSnapshot
```

---

## ✅ Testing Checklist {#testing-checklist}

### Before Writing Tests

- [ ] Test database is created and migrated
- [ ] `.env.test` file is configured
- [ ] Understand the module you're testing

### For Each Module (Minimal Coverage)

#### Unit Tests

- [ ] Service is instantiable
- [ ] `create()` - works with valid data
- [ ] `findAll()` - returns paginated list
- [ ] `findOne()` - returns single item
- [ ] `update()` - updates item
- [ ] `delete()` - deletes item

#### Integration Tests

- [ ] Database operations work correctly
- [ ] Multi-tenant isolation works
- [ ] Unique constraints are enforced

#### E2E Tests

- [ ] Endpoints respond correctly
- [ ] Authentication is enforced
- [ ] Validation errors return proper messages

---

## 📁 Recommended Folder Structure

```
invetrixa-server/
├── src/
│   ├── modules/
│   │   └── category/
│   │       ├── category.service.ts
│   │       ├── category.service.spec.ts    # ← Unit tests (co-located)
│   │       ├── category.controller.ts
│   │       └── category.controller.spec.ts # ← Unit tests (co-located)
│   └── common/
│       └── test-utils/                      # ← Shared test utilities
│           ├── prisma.mock.ts
│           └── test-setup.ts
├── test/
│   ├── integration/                         # ← Integration tests
│   │   └── category.integration.spec.ts
│   ├── e2e/                                 # ← E2E tests (optional subfolder)
│   │   └── category.e2e-spec.ts
│   ├── __mocks__/                           # ← Global mocks
│   │   └── uuid.js
│   ├── app.e2e-spec.ts                      # ← Main E2E test
│   └── jest-e2e.json
└── .env.test                                # ← Test environment config
```

---

## 🎓 Learning Path

1. **Week 1:** Unit tests for `category` and `location` modules
2. **Week 2:** Integration tests for the same modules
3. **Week 3:** E2E tests for API endpoints
4. **Week 4:** Apply patterns to `product`, `stock`, `customer` modules

---

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Supertest for E2E](https://github.com/visionmedia/supertest)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)

---

> 💡 **Tip:** Start with unit tests for the `CategoryService`. It's one of the simplest modules with basic CRUD operations - perfect for learning!
