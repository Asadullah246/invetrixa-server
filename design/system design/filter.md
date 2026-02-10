# Filter & Search Patterns for NestJS + Prisma

This document outlines different approaches for building dynamic filters in our API services.

---

## Current Patterns in Codebase

### Pattern A: Direct Object Mutation

```typescript
private buildProductFilter(
  tenantId: string,
  filterParams: Record<string, unknown>,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (filterParams.status) {
    where.status = filterParams.status as ProductStatus;
  }

  if (filterParams.search) {
    where.OR = [
      { name: { contains: filterParams.search as string, mode: 'insensitive' } },
      { sku: { contains: filterParams.search as string, mode: 'insensitive' } },
    ];
  }

  return where;
}
```

**Pros:** Simple, familiar  
**Cons:** Type casting, potential property conflicts, verbose

---

### Pattern B: Conditions Array with AND

```typescript
private buildFilter(
  tenantId: string,
  filterParams: Partial<QueryMovementDto>,
): Prisma.StockMovementWhereInput {
  const conditions: Prisma.StockMovementWhereInput[] = [{ tenantId }];

  if (filterParams.productId)
    conditions.push({ productId: filterParams.productId });
  if (filterParams.status)
    conditions.push({ status: filterParams.status });

  if (filterParams.dateFrom || filterParams.dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filterParams.dateFrom) dateFilter.gte = new Date(filterParams.dateFrom);
    if (filterParams.dateTo) dateFilter.lte = new Date(filterParams.dateTo);
    conditions.push({ createdAt: dateFilter });
  }

  return { AND: conditions };
}
```

**Pros:** Explicit AND, type-safe with DTO, clean separation  
**Cons:** Still somewhat verbose

---

## Recommended Patterns

### 1. Filter Builder Class (Fluent API)

Create a reusable, chainable builder:

```typescript
// src/common/utils/filter-builder.ts
import { Prisma } from 'generated/prisma/client';

export class FilterBuilder<T extends Record<string, unknown>> {
  private conditions: T[] = [];

  /**
   * Initialize with tenant scope
   */
  constructor(tenantId: string) {
    this.conditions.push({ tenantId } as T);
  }

  /**
   * Add a condition if the value is truthy
   */
  addIf(condition: boolean, filter: T): this {
    if (condition) {
      this.conditions.push(filter);
    }
    return this;
  }

  /**
   * Always add a condition
   */
  add(filter: T): this {
    this.conditions.push(filter);
    return this;
  }

  /**
   * Add exact match filter if value exists
   */
  exact<K extends keyof T>(field: K, value: T[K] | undefined): this {
    if (value !== undefined && value !== null && value !== '') {
      this.conditions.push({ [field]: value } as T);
    }
    return this;
  }

  /**
   * Add search filter across multiple fields
   */
  search(fields: string[], term: string | undefined): this {
    if (term && term.trim()) {
      this.conditions.push({
        OR: fields.map((field) => ({
          [field]: { contains: term.trim(), mode: 'insensitive' },
        })),
      } as T);
    }
    return this;
  }

  /**
   * Add date range filter
   */
  dateRange(
    field: string,
    from: string | Date | undefined,
    to: string | Date | undefined,
  ): this {
    if (from || to) {
      const filter: Record<string, Date> = {};
      if (from) filter.gte = new Date(from);
      if (to) filter.lte = new Date(to);
      this.conditions.push({ [field]: filter } as T);
    }
    return this;
  }

  /**
   * Add numeric range filter
   */
  numericRange(
    field: string,
    min: number | undefined,
    max: number | undefined,
  ): this {
    if (min !== undefined || max !== undefined) {
      const filter: Record<string, number> = {};
      if (min !== undefined) filter.gte = min;
      if (max !== undefined) filter.lte = max;
      this.conditions.push({ [field]: filter } as T);
    }
    return this;
  }

  /**
   * Add IN filter (value in array)
   */
  in<K extends keyof T>(field: K, values: unknown[] | undefined): this {
    if (values && values.length > 0) {
      this.conditions.push({ [field]: { in: values } } as T);
    }
    return this;
  }

  /**
   * Add relation exists filter
   */
  hasRelation(relation: string, condition: Record<string, unknown>): this {
    this.conditions.push({
      [relation]: { some: condition },
    } as T);
    return this;
  }

  /**
   * Add soft delete filter
   */
  notDeleted(): this {
    this.conditions.push({ deletedAt: null } as T);
    return this;
  }

  /**
   * Build the final Prisma where clause
   */
  build(): { AND: T[] } {
    return { AND: this.conditions };
  }
}
```

#### Usage Examples

```typescript
// Simple usage
private buildFilter(tenantId: string, params: Partial<QueryMovementDto>) {
  return new FilterBuilder<Prisma.StockMovementWhereInput>(tenantId)
    .exact('productId', params.productId)
    .exact('locationId', params.locationId)
    .exact('status', params.status)
    .exact('movementType', params.movementType)
    .exact('referenceType', params.referenceType)
    .dateRange('createdAt', params.dateFrom, params.dateTo)
    .build();
}

// With search and relations
private buildProductFilter(tenantId: string, params: Partial<QueryProductDto>) {
  return new FilterBuilder<Prisma.ProductWhereInput>(tenantId)
    .notDeleted()
    .exact('status', params.status)
    .exact('productType', params.productType)
    .search(['name', 'sku', 'shortDescription'], params.search)
    .addIf(!!params.categoryId, {
      categories: { some: { categoryId: params.categoryId } },
    })
    .addIf(params.isFeatured === 'true', { isFeatured: true })
    .build();
}
```

---

### 2. Declarative Filter Configuration

Define filters as configuration objects:

```typescript
// src/common/utils/declarative-filter.ts

type FilterType = 'exact' | 'search' | 'dateGte' | 'dateLte' | 'in' | 'boolean';

interface FilterRule {
  type: FilterType;
  field?: string; // Target field (defaults to param key)
  fields?: string[]; // For search across multiple fields
  transform?: (value: unknown) => unknown;
}

type FilterConfig = Record<string, FilterRule>;

// Filter configuration for movements
const MOVEMENT_FILTER_CONFIG: FilterConfig = {
  productId: { type: 'exact' },
  locationId: { type: 'exact' },
  status: { type: 'exact' },
  movementType: { type: 'exact' },
  referenceType: { type: 'exact' },
  dateFrom: { type: 'dateGte', field: 'createdAt' },
  dateTo: { type: 'dateLte', field: 'createdAt' },
};

// Filter configuration for products
const PRODUCT_FILTER_CONFIG: FilterConfig = {
  status: { type: 'exact' },
  productType: { type: 'exact' },
  isFeatured: { type: 'boolean' },
  unitType: { type: 'exact' },
  search: { type: 'search', fields: ['name', 'sku', 'shortDescription'] },
};

// Generic filter builder from config
function buildFilterFromConfig<T>(
  tenantId: string,
  params: Record<string, unknown>,
  config: FilterConfig,
  options?: { softDelete?: boolean },
): { AND: T[] } {
  const conditions: T[] = [{ tenantId } as T];

  if (options?.softDelete !== false) {
    conditions.push({ deletedAt: null } as T);
  }

  for (const [paramKey, rule] of Object.entries(config)) {
    const value = params[paramKey];
    if (value === undefined || value === null || value === '') continue;

    const targetField = rule.field ?? paramKey;

    switch (rule.type) {
      case 'exact':
        conditions.push({ [targetField]: value } as T);
        break;

      case 'search':
        if (rule.fields) {
          conditions.push({
            OR: rule.fields.map((f) => ({
              [f]: { contains: value as string, mode: 'insensitive' },
            })),
          } as T);
        }
        break;

      case 'dateGte':
        conditions.push({
          [targetField]: { gte: new Date(value as string) },
        } as T);
        break;

      case 'dateLte':
        conditions.push({
          [targetField]: { lte: new Date(value as string) },
        } as T);
        break;

      case 'in':
        if (Array.isArray(value) && value.length > 0) {
          conditions.push({ [targetField]: { in: value } } as T);
        }
        break;

      case 'boolean':
        conditions.push({
          [targetField]: value === 'true' || value === true,
        } as T);
        break;
    }
  }

  return { AND: conditions };
}
```

#### Usage

```typescript
// In service
private buildFilter(tenantId: string, params: Partial<QueryMovementDto>) {
  return buildFilterFromConfig<Prisma.StockMovementWhereInput>(
    tenantId,
    params,
    MOVEMENT_FILTER_CONFIG,
  );
}
```

---

### 3. DTO-Driven with Decorators

Use decorators to define filter behavior:

```typescript
// src/common/decorators/filter.decorators.ts
import 'reflect-metadata';

const FILTER_METADATA_KEY = 'filter:config';

interface FilterMetadata {
  type: 'exact' | 'search' | 'dateRange' | 'in' | 'boolean';
  field?: string;
  fields?: string[];
}

// Decorators
export function FilterExact(field?: string): PropertyDecorator {
  return (target, propertyKey) => {
    const existing = Reflect.getMetadata(FILTER_METADATA_KEY, target) || {};
    existing[propertyKey] = { type: 'exact', field };
    Reflect.defineMetadata(FILTER_METADATA_KEY, existing, target);
  };
}

export function FilterSearch(fields: string[]): PropertyDecorator {
  return (target, propertyKey) => {
    const existing = Reflect.getMetadata(FILTER_METADATA_KEY, target) || {};
    existing[propertyKey] = { type: 'search', fields };
    Reflect.defineMetadata(FILTER_METADATA_KEY, existing, target);
  };
}

export function FilterDateGte(field: string): PropertyDecorator {
  return (target, propertyKey) => {
    const existing = Reflect.getMetadata(FILTER_METADATA_KEY, target) || {};
    existing[propertyKey] = { type: 'dateRange', field, position: 'gte' };
    Reflect.defineMetadata(FILTER_METADATA_KEY, existing, target);
  };
}

export function FilterDateLte(field: string): PropertyDecorator {
  return (target, propertyKey) => {
    const existing = Reflect.getMetadata(FILTER_METADATA_KEY, target) || {};
    existing[propertyKey] = { type: 'dateRange', field, position: 'lte' };
    Reflect.defineMetadata(FILTER_METADATA_KEY, existing, target);
  };
}

// Get filter config from DTO class
export function getFilterMetadata(
  dtoClass: new () => unknown,
): Record<string, FilterMetadata> {
  return Reflect.getMetadata(FILTER_METADATA_KEY, dtoClass.prototype) || {};
}
```

#### DTO Definition

```typescript
// query-movement.dto.ts
import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import {
  FilterExact,
  FilterSearch,
  FilterDateGte,
  FilterDateLte,
} from '@/common/decorators';

export class QueryMovementDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @FilterExact()
  productId?: string;

  @IsOptional()
  @IsString()
  @FilterExact()
  locationId?: string;

  @IsOptional()
  @IsEnum(StockMovementStatus)
  @FilterExact()
  status?: StockMovementStatus;

  @IsOptional()
  @IsString()
  @FilterSearch(['note'])
  search?: string;

  @IsOptional()
  @IsDateString()
  @FilterDateGte('createdAt')
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  @FilterDateLte('createdAt')
  dateTo?: string;
}
```

#### Auto-Build from DTO

```typescript
// src/common/utils/dto-filter-builder.ts
import { getFilterMetadata } from '@/common/decorators';

export function buildFilterFromDto<T, D extends new () => unknown>(
  dtoClass: D,
  params: InstanceType<D>,
  tenantId: string,
): { AND: T[] } {
  const metadata = getFilterMetadata(dtoClass);
  const conditions: T[] = [{ tenantId } as T];

  for (const [key, config] of Object.entries(metadata)) {
    const value = (params as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;

    const field = config.field ?? key;

    switch (config.type) {
      case 'exact':
        conditions.push({ [field]: value } as T);
        break;
      case 'search':
        conditions.push({
          OR: config.fields!.map((f) => ({
            [f]: { contains: value, mode: 'insensitive' },
          })),
        } as T);
        break;
      // ... more cases
    }
  }

  return { AND: conditions };
}
```

#### Usage

```typescript
// In service - minimal code!
private buildFilter(tenantId: string, params: QueryMovementDto) {
  return buildFilterFromDto<Prisma.StockMovementWhereInput, typeof QueryMovementDto>(
    QueryMovementDto,
    params,
    tenantId,
  );
}
```

---

## Comparison Matrix

| Pattern            | Type Safety  | Reusability | Verbosity | Flexibility | Learning Curve |
| ------------------ | ------------ | ----------- | --------- | ----------- | -------------- |
| Direct Mutation    | ⚠️ Low       | ❌ None     | 🔴 High   | ✅ High     | 🟢 Easy        |
| AND Array          | ✅ Good      | ⚠️ Low      | 🟡 Medium | ✅ High     | 🟢 Easy        |
| **Filter Builder** | ✅ Good      | ✅ High     | 🟢 Low    | ✅ High     | 🟡 Medium      |
| Declarative Config | ✅ Good      | ✅ High     | 🟢 Low    | ⚠️ Medium   | 🟡 Medium      |
| DTO Decorators     | ✅ Excellent | ✅ High     | 🟢 Low    | ⚠️ Medium   | 🔴 Higher      |

---

## Recommendation

**For this project, use the Filter Builder Class (Pattern 1):**

1. ✅ Best balance of flexibility and reusability
2. ✅ Fluent API is intuitive and readable
3. ✅ No external dependencies
4. ✅ Easy to extend with custom methods
5. ✅ Works well with TypeScript generics

### Implementation Steps

1. Create `src/common/utils/filter-builder.ts`
2. Update existing `buildFilter` functions to use the builder
3. Add new methods as needed (e.g., `hasArrayValue`, `nested`)

---

## Example Migration

### Before

```typescript
private buildFilter(
  tenantId: string,
  filterParams: Partial<QueryMovementDto>,
): Prisma.StockMovementWhereInput {
  const conditions: Prisma.StockMovementWhereInput[] = [{ tenantId }];

  if (filterParams.productId)
    conditions.push({ productId: filterParams.productId });
  if (filterParams.locationId)
    conditions.push({ locationId: filterParams.locationId });
  if (filterParams.movementType)
    conditions.push({ movementType: filterParams.movementType });
  if (filterParams.status)
    conditions.push({ status: filterParams.status });
  if (filterParams.referenceType)
    conditions.push({ referenceType: filterParams.referenceType });

  if (filterParams.dateFrom || filterParams.dateTo) {
    const dateFilter: Prisma.DateTimeFilter = {};
    if (filterParams.dateFrom)
      dateFilter.gte = new Date(filterParams.dateFrom);
    if (filterParams.dateTo)
      dateFilter.lte = new Date(filterParams.dateTo);
    conditions.push({ createdAt: dateFilter });
  }

  return { AND: conditions };
}
```

### After

```typescript
private buildFilter(tenantId: string, params: Partial<QueryMovementDto>) {
  return new FilterBuilder<Prisma.StockMovementWhereInput>(tenantId)
    .exact('productId', params.productId)
    .exact('locationId', params.locationId)
    .exact('movementType', params.movementType)
    .exact('status', params.status)
    .exact('referenceType', params.referenceType)
    .dateRange('createdAt', params.dateFrom, params.dateTo)
    .build();
}
```

**Result:** 20+ lines → 8 lines, more readable, reusable pattern
