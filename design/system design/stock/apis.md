# Stock Management APIs

## Overview

This document outlines all APIs needed for the stock management system.
Organized by module with clear purpose and data operations.

---

## 📦 STOCK MOVEMENTS (Core - Ledger Operations)

Stock movements are the **source of truth** for all inventory changes.

| Method | Endpoint                | Purpose                           | What Happens                                                        |
| ------ | ----------------------- | --------------------------------- | ------------------------------------------------------------------- |
| `POST` | `/stocks/in`            | Receive stock (purchase, initial) | Creates Movement (IN) + ValuationLayer + Updates InventoryBalance   |
| `POST` | `/stocks/out`           | Remove stock (sale, damage, loss) | Creates Movement (OUT) + Consumes Layers + Updates InventoryBalance |
| `POST` | `/stocks/return`        | Customer return                   | Creates Movement (IN) + ValuationLayer + Updates InventoryBalance   |
| `POST` | `/stocks/adjust`        | Manual correction (+/-)           | Creates Movement + Updates Balance (can be IN or OUT)               |
| `GET`  | `/stocks/movements`     | List movements (paginated)        | Filters: product, location, date, type, reference                   |
| `GET`  | `/stocks/movements/:id` | Single movement details           | Includes layer consumptions                                         |

### Request Examples

#### POST /stocks/in

```json
{
  "productId": "uuid",
  "locationId": "uuid",
  "quantity": 100,
  "unitCost": 25.5,
  "referenceType": "PURCHASE",
  "referenceId": "PO-2024-001",
  "batchId": "uuid (optional)",
  "note": "Initial stock from supplier"
}
```

#### POST /stocks/out

```json
{
  "productId": "uuid",
  "locationId": "uuid",
  "quantity": 10,
  "referenceType": "SALE",
  "referenceId": "ORDER-2024-001",
  "note": "Order fulfillment"
}
```

---

## 🔄 TRANSFERS (Multi-Warehouse)

Transfers move stock between warehouses with in-transit tracking.

| Method  | Endpoint                        | Purpose                          | What Happens                                            |
| ------- | ------------------------------- | -------------------------------- | ------------------------------------------------------- |
| `POST`  | `/stocks/transfers`             | Create transfer (DRAFT)          | Creates Transfer + TransferItems only (NO movement yet) |
| `GET`   | `/stocks/transfers`             | List transfers (paginated)       | Filters: status, fromLocation, toLocation, date         |
| `GET`   | `/stocks/transfers/:id`         | Transfer details                 | Includes items and related movements                    |
| `PATCH` | `/stocks/transfers/:id/ship`    | Ship (DRAFT → IN_TRANSIT)        | Creates OUT movement + Updates source InventoryBalance  |
| `PATCH` | `/stocks/transfers/:id/receive` | Receive (IN_TRANSIT → COMPLETED) | Creates IN movement + Updates dest InventoryBalance     |
| `PATCH` | `/stocks/transfers/:id/cancel`  | Cancel transfer                  | Updates status only (reverses movements if in-transit)  |

### Transfer Lifecycle

```
DRAFT ──────────▶ IN_TRANSIT ──────────▶ COMPLETED
  │                    │                     │
  │ No stock change    │ OUT at source       │ IN at destination
  │ Can edit/cancel    │ Stock leaves WH-A   │ Stock arrives WH-B
  │                    │                     │
  └── Can cancel ──────┴──── Can cancel ─────┘ (creates reversal movements)
```

### Request Examples

#### POST /stocks/transfers

```json
{
  "fromLocationId": "uuid",
  "toLocationId": "uuid",
  "items": [
    { "productId": "uuid", "requestedQuantity": 50 },
    { "productId": "uuid", "requestedQuantity": 30 }
  ],
  "note": "Weekly restock for branch B"
}
```

#### PATCH /stocks/transfers/:id/ship

```json
{
  "items": [
    { "productId": "uuid", "shippedQuantity": 50 },
    { "productId": "uuid", "shippedQuantity": 28 }
  ],
  "note": "2 units of product B were damaged"
}
```

#### PATCH /stocks/transfers/:id/receive

```json
{
  "items": [
    { "productId": "uuid", "receivedQuantity": 50 },
    { "productId": "uuid", "receivedQuantity": 28 }
  ],
  "note": "All items received in good condition"
}
```

---

## 📊 INVENTORY (Read-Only Queries)

Fast read queries from InventoryBalance table.

| Method | Endpoint                        | Purpose                      | Source                                  |
| ------ | ------------------------------- | ---------------------------- | --------------------------------------- |
| `GET`  | `/stocks/balance`               | All stock (paginated)        | InventoryBalance                        |
| `GET`  | `/stocks/balance/products/:id`  | Stock for one product        | InventoryBalance (all locations)        |
| `GET`  | `/stocks/balance/locations/:id` | Stock at one location        | InventoryBalance (all products)         |
| `GET`  | `/stocks/low-stock`             | Products below reorder level | InventoryBalance + Product.reorderLevel |
| `GET`  | `/stocks/valuation`             | Inventory value report       | ValuationLayer (FIFO/LIFO/WAC)          |

### Query Parameters

```
GET /stocks/balance?
  productId=uuid&
  locationId=uuid&
  belowReorderLevel=true&
  page=1&
  limit=50
```

### Response Example

```json
{
  "data": [
    {
      "id": "uuid",
      "productId": "uuid",
      "productName": "iPhone 15",
      "locationId": "uuid",
      "locationName": "Warehouse A",
      "onHandQuantity": 150,
      "reservedQuantity": 10,
      "availableQuantity": 140,
      "reorderLevel": 50,
      "isLowStock": false
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 120 }
}
```

---

## 🔒 RESERVATIONS (Optional - For Cart/Orders)

Prevent overselling by reserving stock temporarily.

| Method   | Endpoint                   | Purpose             | What Happens                                           |
| -------- | -------------------------- | ------------------- | ------------------------------------------------------ |
| `POST`   | `/stocks/reservations`     | Reserve stock       | Creates Reservation + Updates Balance.reservedQuantity |
| `GET`    | `/stocks/reservations`     | List reservations   | Filters: product, location, status, expiry             |
| `GET`    | `/stocks/reservations/:id` | Reservation details | -                                                      |
| `PATCH`  | `/stocks/reservations/:id` | Extend expiry       | Updates expiresAt                                      |
| `DELETE` | `/stocks/reservations/:id` | Release reservation | Updates status + Decreases Balance.reservedQuantity    |

### Request Example

#### POST /stocks/reservations

```json
{
  "productId": "uuid",
  "locationId": "uuid",
  "quantity": 5,
  "expiresAt": "2024-01-07T15:00:00Z",
  "referenceType": "CART",
  "referenceId": "cart-uuid"
}
```

---

## 🏷️ BATCHES (Optional - For Traceability)

Track lots, expiry dates, and recalls.

| Method  | Endpoint                   | Purpose                             |
| ------- | -------------------------- | ----------------------------------- |
| `POST`  | `/stocks/batches`          | Create batch                        |
| `GET`   | `/stocks/batches`          | List batches (with filters)         |
| `GET`   | `/stocks/batches/:id`      | Batch details with movements        |
| `PATCH` | `/stocks/batches/:id`      | Update status (QUARANTINE/RECALLED) |
| `GET`   | `/stocks/batches/expiring` | Batches expiring within N days      |

### Request Example

#### POST /stocks/batches

```json
{
  "batchNumber": "LOT-2024-001",
  "productId": "uuid",
  "manufacturingDate": "2024-01-01",
  "expiryDate": "2025-01-01",
  "supplierId": "uuid",
  "notes": "First batch from new supplier"
}
```

---

## 📋 API Summary

| Module                | APIs   | Priority     |
| --------------------- | ------ | ------------ |
| **Stock Movements**   | 6      | 🔴 Essential |
| **Transfers**         | 6      | 🔴 Essential |
| **Inventory Balance** | 5      | 🔴 Essential |
| **Reservations**      | 5      | 🟡 Optional  |
| **Batches**           | 5      | 🟡 Optional  |
| **Total**             | **27** |              |

---

## 🚫 Anti-Patterns (DO NOT CREATE)

These APIs violate inventory management principles:

| ❌ Bad API                     | Why                        | ✅ Use Instead           |
| ------------------------------ | -------------------------- | ------------------------ |
| `PUT /products/:id/quantity`   | Direct mutation, no audit  | `POST /stocks/adjust`    |
| `PATCH /stocks/movements/:id`  | Movements are immutable    | Create new adjustment    |
| `DELETE /stocks/movements/:id` | History must be preserved  | Create reversal movement |
| `POST /stocks/balance`         | Balance is auto-calculated | Use movement APIs        |

---

## 🧠 Golden Rules

1. **Quantity changes → POST only** (creates movement)
2. **Reads → GET only** (no side effects)
3. **Status updates → PATCH only** (transfers, reservations)
4. **History is immutable → never delete/update movements**
5. **Balance is derived → never directly modified**

---

## 🚀 Implementation Phases

### Phase 1 (MVP) - 17 APIs

- Stock Movements: 6 APIs
- Transfers: 6 APIs
- Inventory Balance: 5 APIs

### Phase 2 (Advanced) - 10 APIs

- Reservations: 5 APIs
- Batches: 5 APIs
