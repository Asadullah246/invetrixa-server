# Product & Stock Management API Documentation

This document outlines all API endpoints for the Product and Stock Management system.

---

## Overview

The product management system consists of 7 main entities:

- **Products** - Core product catalog
- **Product Categories** - Hierarchical categories for products
- **Attributes** - Reusable product attributes (e.g., Size, Color)
- **Suppliers** - Vendor/supplier management
- **Batches** - Inventory batches with tracking
- **Batch Locations** - Inventory per location
- **Stock Movements** - Track transfers, adjustments, returns

---

## Module Structure Recommendation

```
src/modules/
├── product/           # Core product management
├── category/          # Product categories (can be nested in product/)
├── attribute/         # Product attributes (can be nested in product/)
├── supplier/          # Supplier management
├── inventory/         # Batches, locations, stock movements
└── location/          # Warehouse/location management (if not exists)
```

---

## API Endpoints

### 1. Products (14 APIs)

| Method   | Endpoint                                | Description                                       |
| -------- | --------------------------------------- | ------------------------------------------------- |
| `POST`   | `/products`                             | Create a new product                              |
| `GET`    | `/products`                             | List products with pagination, filtering, sorting |
| `GET`    | `/products/:id`                         | Get product by ID with full details               |
| `GET`    | `/products/slug/:slug`                  | Get product by slug                               |
| `PATCH`  | `/products/:id`                         | Update product                                    |
| `DELETE` | `/products/:id`                         | Soft delete product                               |
| `DELETE` | `/products/bulk`                        | Bulk soft delete products                         |
| `PATCH`  | `/products/:id/status`                  | Update product status (DRAFT/ACTIVE/ARCHIVED)     |
| `PATCH`  | `/products/:id/featured`                | Toggle featured status                            |
| `POST`   | `/products/:id/categories`              | Assign categories to product                      |
| `DELETE` | `/products/:id/categories/:categoryId`  | Remove category from product                      |
| `POST`   | `/products/:id/attributes`              | Add attribute to product                          |
| `DELETE` | `/products/:id/attributes/:attributeId` | Remove attribute from product                     |
| `GET`    | `/products/:id/variants`                | Get product variants                              |

#### Product List Query Parameters

```typescript
{
  page?: number;          // Default: 1
  limit?: number;         // Default: 10, Max: 100
  search?: string;        // Search in name, sku, barcode
  status?: ProductStatus; // DRAFT, ACTIVE, ARCHIVED
  categoryId?: string;    // Filter by category
  isFeatured?: boolean;   // Filter featured products
  minPrice?: number;      // Price range filter (requires pricing)
  maxPrice?: number;
  tags?: string[];        // Filter by tags
  sortBy?: string;        // name, createdAt, updatedAt
  sortOrder?: 'asc' | 'desc';
}
```

---

### 2. Product Categories (9 APIs)

| Method   | Endpoint                   | Description                            |
| -------- | -------------------------- | -------------------------------------- |
| `POST`   | `/categories`              | Create a new category                  |
| `GET`    | `/categories`              | List categories (flat with pagination) |
| `GET`    | `/categories/tree`         | Get category tree (hierarchical)       |
| `GET`    | `/categories/:id`          | Get category by ID                     |
| `GET`    | `/categories/slug/:slug`   | Get category by slug                   |
| `PATCH`  | `/categories/:id`          | Update category                        |
| `DELETE` | `/categories/:id`          | Soft delete category                   |
| `PATCH`  | `/categories/:id/status`   | Update category status                 |
| `GET`    | `/categories/:id/products` | Get products in category               |

---

### 3. Attributes (7 APIs)

| Method   | Endpoint                        | Description                 |
| -------- | ------------------------------- | --------------------------- |
| `POST`   | `/attributes`                   | Create a new attribute      |
| `GET`    | `/attributes`                   | List all attributes         |
| `GET`    | `/attributes/:id`               | Get attribute by ID         |
| `PATCH`  | `/attributes/:id`               | Update attribute            |
| `DELETE` | `/attributes/:id`               | Delete attribute            |
| `POST`   | `/attributes/:id/values`        | Add value to attribute      |
| `DELETE` | `/attributes/:id/values/:value` | Remove value from attribute |

---

### 4. Suppliers (7 APIs)

| Method   | Endpoint                 | Description                    |
| -------- | ------------------------ | ------------------------------ |
| `POST`   | `/suppliers`             | Create a new supplier          |
| `GET`    | `/suppliers`             | List suppliers with pagination |
| `GET`    | `/suppliers/:id`         | Get supplier by ID             |
| `PATCH`  | `/suppliers/:id`         | Update supplier                |
| `DELETE` | `/suppliers/:id`         | Soft delete supplier           |
| `DELETE` | `/suppliers/bulk`        | Bulk delete suppliers          |
| `GET`    | `/suppliers/:id/batches` | Get batches from supplier      |

---

### 5. Inventory - Batches (10 APIs)

| Method  | Endpoint                                | Description                   |
| ------- | --------------------------------------- | ----------------------------- |
| `POST`  | `/inventory/batches`                    | Create a new batch (stock in) |
| `GET`   | `/inventory/batches`                    | List batches with filters     |
| `GET`   | `/inventory/batches/:id`                | Get batch details             |
| `PATCH` | `/inventory/batches/:id`                | Update batch                  |
| `PATCH` | `/inventory/batches/:id/status`         | Update batch status           |
| `GET`   | `/inventory/batches/product/:productId` | Get batches for a product     |
| `GET`   | `/inventory/batches/expiring`           | Get expiring batches          |
| `GET`   | `/inventory/batches/low-stock`          | Get low stock batches         |
| `GET`   | `/inventory/batches/:id/locations`      | Get batch locations           |
| `POST`  | `/inventory/batches/:id/allocate`       | Allocate batch to location    |

#### Batch Query Parameters

```typescript
{
  page?: number;
  limit?: number;
  productId?: string;
  supplierId?: string;
  status?: BatchStatus;        // ACTIVE, EXPIRED, IN_TRANSIT
  locationId?: string;
  expiringBefore?: Date;       // For expiry alerts
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

---

### 6. Inventory - Batch Locations (5 APIs)

| Method  | Endpoint                                              | Description                      |
| ------- | ----------------------------------------------------- | -------------------------------- |
| `GET`   | `/inventory/locations`                                | Get inventory by location        |
| `GET`   | `/inventory/locations/:locationId`                    | Get all batches at a location    |
| `GET`   | `/inventory/locations/:locationId/product/:productId` | Get product stock at location    |
| `PATCH` | `/inventory/batch-locations/:id`                      | Update batch location quantities |
| `POST`  | `/inventory/batch-locations/:id/reserve`              | Reserve inventory                |

---

### 7. Stock Movements (12 APIs)

| Method  | Endpoint                                    | Description                       |
| ------- | ------------------------------------------- | --------------------------------- |
| `POST`  | `/inventory/movements`                      | Create stock movement             |
| `GET`   | `/inventory/movements`                      | List all movements                |
| `GET`   | `/inventory/movements/:id`                  | Get movement details              |
| `PATCH` | `/inventory/movements/:id/status`           | Update movement status            |
| `POST`  | `/inventory/movements/:id/complete`         | Complete a movement               |
| `POST`  | `/inventory/movements/:id/cancel`           | Cancel a movement                 |
| `POST`  | `/inventory/transfer`                       | Create transfer between locations |
| `POST`  | `/inventory/adjustment`                     | Create stock adjustment           |
| `POST`  | `/inventory/return`                         | Create return movement            |
| `GET`   | `/inventory/movements/product/:productId`   | Get movements for product         |
| `GET`   | `/inventory/movements/location/:locationId` | Get movements for location        |
| `GET`   | `/inventory/movements/report`               | Generate movement report          |

#### Movement Request Body (Transfer)

```typescript
{
  productId: string;
  batchId?: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  unitCost?: number;
  shippingCost?: number;
  note?: string;
}
```

---

### 8. Reports & Analytics (6 APIs)

| Method | Endpoint                                  | Description                              |
| ------ | ----------------------------------------- | ---------------------------------------- |
| `GET`  | `/inventory/reports/stock-levels`         | Current stock levels by product/location |
| `GET`  | `/inventory/reports/stock-value`          | Total inventory value                    |
| `GET`  | `/inventory/reports/movement-history`     | Movement history report                  |
| `GET`  | `/inventory/reports/low-stock-alerts`     | Products below reorder level             |
| `GET`  | `/inventory/reports/expiring-stock`       | Expiring inventory report                |
| `GET`  | `/inventory/reports/supplier-performance` | Supplier delivery metrics                |

---

## API Summary

| Module          | Count  | Description                                       |
| --------------- | ------ | ------------------------------------------------- |
| Products        | 14     | Core product CRUD + category/attribute management |
| Categories      | 9      | Hierarchical category management                  |
| Attributes      | 7      | Product attribute templates                       |
| Suppliers       | 7      | Vendor management                                 |
| Batches         | 10     | Inventory batch tracking                          |
| Batch Locations | 5      | Location-based inventory                          |
| Stock Movements | 12     | Transfers, adjustments, returns                   |
| Reports         | 6      | Analytics and reporting                           |
| **Total**       | **70** | Complete inventory management                     |

---

## Implementation Priority

### Phase 1: Core Product Management

1. Products CRUD (8 APIs)
2. Categories CRUD (6 APIs)
3. Attributes CRUD (5 APIs)

### Phase 2: Supplier & Basic Inventory

4. Suppliers CRUD (5 APIs)
5. Batches CRUD (6 APIs)
6. Batch Locations basic (3 APIs)

### Phase 3: Stock Operations

7. Stock Movements full (12 APIs)
8. Advanced product features (6 APIs)

### Phase 4: Reporting & Advanced

9. Reports & Analytics (6 APIs)
10. Remaining APIs

---

## Authentication & Authorization

All endpoints require:

- **Authentication**: JWT Bearer token
- **Tenant Context**: Automatic tenant scoping
- **Permissions**: Role-based access control

Example permissions:

- `product:create`, `product:read`, `product:update`, `product:delete`
- `inventory:create`, `inventory:read`, `inventory:update`, `inventory:transfer`
- `supplier:manage`
- `reports:view`

---

## Common Response Patterns

### List Response

```typescript
{
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }
}
```

### Single Item Response

```typescript
{
  data: T;
  message?: string;
}
```

### Error Response

```typescript
{
  statusCode: number;
  message: string;
  error: string;
}
```
