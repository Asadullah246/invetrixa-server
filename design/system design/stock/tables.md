# Stock Management Tables Design

## Enums

```prisma
enum StockMovementType {
  IN        // Stock increase (purchase, return, adjustment+)
  OUT       // Stock decrease (sale, adjustment-, damage)
}

enum StockReferenceType {
  PURCHASE    // Initial stock / purchase order
  SALE        // Sale / order fulfillment
  TRANSFER    // Inter-warehouse transfer
  RETURN      // Customer return
  ADJUSTMENT  // Manual adjustment (damage, loss, correction)
}

enum StockMovementStatus {
  PENDING     // Awaiting processing
  COMPLETED   // Fully processed
  CANCELLED   // Cancelled (for audit trail)
}

enum TransferStatus {
  DRAFT       // Not yet initiated
  IN_TRANSIT  // Shipped, awaiting arrival
  COMPLETED   // Received at destination
  CANCELLED   // Transfer cancelled
}

enum ReservationStatus {
  ACTIVE      // Currently held
  RELEASED    // Released back to availability
  FULFILLED   // Converted to sale
  EXPIRED     // Auto-released due to timeout
}
```

---

## 🔹 INVENTORY BALANCE (FAST READ TABLE)

Materialized view pattern for current stock - updated on every stock change.
Use this for availability checks, low stock alerts, and UI display.

```prisma
model InventoryBalance {
  id               String   @id @default(uuid())
  productId        String
  locationId       String

  onHandQuantity   Int      @default(0)  // Total physical stock
  reservedQuantity Int      @default(0)  // Reserved for orders
  // Available = onHandQuantity - reservedQuantity (computed on read)

  product  Product  @relation(fields: [productId], references: [id])
  location Location @relation(fields: [locationId], references: [id])
  tenant   Tenant   @relation(fields: [tenantId], references: [id])

  @@unique([productId, locationId])
}
```

---

## 🔹 VALUATION LAYER (FIFO / LIFO / COGS)

**This is the heart of costing.** Each layer represents a purchase batch with its cost and remaining quantity.

- **FIFO**: consume oldest layers first (order by `createdAt ASC`)
- **LIFO**: consume newest layers first (order by `createdAt DESC`)
- **MOVING_AVERAGE**: calculate weighted average across all layers, recalculated on each purchase

```prisma
model ValuationLayer {
  id             String   @id @default(uuid())
  productId      String
  locationId     String

  unitCost       Decimal  @db.Decimal(12, 4)  // Cost per unit
  originalQty    Int                           // Original quantity when created
  remainingQty   Int                           // Current remaining quantity

  sourceMovementId String?  // Movement that created this layer

  product  Product  @relation(fields: [productId], references: [id])
  location Location @relation(fields: [locationId], references: [id])

  createdAt DateTime @default(now())

  @@index([productId, locationId, createdAt])  // For FIFO queries
}
```

### Valuation Layer Consumption

Tracks which layers were consumed by which movements (for COGS calculation).

```prisma
model ValuationLayerConsumption {
  id               String @id @default(uuid())
  quantity         Int
  unitCost         Decimal @db.Decimal(12, 4)

  valuationLayerId String
  stockMovementId  String

  createdAt DateTime @default(now())
}
```

---

## 🔹 STOCK MOVEMENT (LEDGER – APPEND ONLY)

**Every stock change creates rows here. NEVER delete or update quantity.**
This is your audit trail and source of truth.

```prisma
model StockMovement {
  id             String @id @default(uuid())
  productId      String
  locationId     String

  movementType   StockMovementType    // IN or OUT
  quantity       Int                   // Always positive
  unitCost       Decimal  @db.Decimal(12, 4)
  totalCost      Decimal  @db.Decimal(14, 4)

  referenceType  StockReferenceType   // PURCHASE, SALE, TRANSFER, etc.
  referenceId    String?              // ID of source document
  transferId     String?              // Link to transfer record (for transfers)

  status         StockMovementStatus  @default(COMPLETED)
  note           String?
  metadata       Json?

  product  Product  @relation(fields: [productId], references: [id])
  location Location @relation(fields: [locationId], references: [id])
  createdBy User?   @relation(fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  // NO updatedAt - movements are immutable!

  @@index([productId, locationId])
  @@index([referenceType, referenceId])
}
```

---

## 🔹 STOCK TRANSFER (MULTI-WAREHOUSE WITH IN-TRANSIT)

Track transfers between warehouses with full lifecycle tracking.

```prisma
model StockTransfer {
  id             String @id @default(uuid())
  transferNumber String @db.VarChar(50)

  fromLocationId String
  toLocationId   String

  status         TransferStatus @default(DRAFT)

  // Dates for tracking
  shippedAt      DateTime?  // When transfer left source
  receivedAt     DateTime?  // When arrived at destination
  cancelledAt    DateTime?

  note           String?
  metadata       Json?

  tenantId String
  createdById String?

  // Line items
  items StockTransferItem[]

  // Related stock movements
  movements StockMovement[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([transferNumber, tenantId])
}
```

### Stock Transfer Item

Line items for each product in a transfer.

```prisma
model StockTransferItem {
  id                String @id @default(uuid())

  requestedQuantity Int    // Quantity requested
  shippedQuantity   Int    @default(0)  // Actually shipped
  receivedQuantity  Int    @default(0)  // Received at destination

  note              String?

  productId  String
  transferId String

  @@unique([transferId, productId])
}
```

---

## 🔹 STOCK RESERVATION

Prevents overselling by reserving stock for carts/orders.

```prisma
model StockReservation {
  id          String @id @default(uuid())
  productId   String
  locationId  String

  quantity    Int
  expiresAt   DateTime
  status      ReservationStatus @default(ACTIVE)

  referenceType String?  // "CART", "ORDER", etc.
  referenceId   String?

  product  Product  @relation(fields: [productId], references: [id])
  location Location @relation(fields: [locationId], references: [id])

  createdAt DateTime @default(now())

  @@index([productId, locationId])
  @@index([expiresAt])
}
```

---

## 🔹 LOW STOCK THRESHOLD

Per-product, per-location threshold settings for alerts.

```prisma
model LowStockThreshold {
  id          String @id @default(uuid())
  productId   String
  locationId  String?  // null = all locations

  reorderLevel Int @default(10)   // Alert threshold
  reorderQty   Int @default(50)   // Suggested reorder qty

  @@unique([productId, locationId])
}
```

---

## 🧠 HOW EVERYTHING CONNECTS (MENTAL MODEL)

```
POST stock APIs → create StockMovement

StockMovement →
  ├── updates InventoryBalance
  └── consumes / creates ValuationLayer

FIFO / LIFO → driven by ValuationLayer order

Transfers →
  ├── StockTransfer (header)
  ├── StockTransferItem (line items)
  └── StockMovement (OUT at source, IN at destination)

Sales → OUT movement + COGS (via ValuationLayerConsumption)

Reservations → reduce availability, not stock
```

---

## 🚀 COSTING METHODS SUPPORT

| Method             | How It Works                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **FIFO**           | Consume `ValuationLayer` ordered by `createdAt ASC`                                                           |
| **LIFO**           | Consume `ValuationLayer` ordered by `createdAt DESC`                                                          |
| **MOVING_AVERAGE** | Calculate weighted average: `SUM(unitCost * remainingQty) / SUM(remainingQty)`, recalculated on each purchase |

The `TenantSettings.defaultPricingMethod` determines which method to use.

---

## 🏆 FINAL DESIGN VERDICT

✔ **Audit-safe** - Immutable ledger (StockMovement)
✔ **Scalable** - Separated read (InventoryBalance) and write (StockMovement) paths
✔ **Accounting-ready** - Proper COGS tracking via ValuationLayerConsumption
✔ **Multi-warehouse** - Full transfer lifecycle with in-transit tracking
✔ **FIFO/LIFO/MOVING_AVERAGE** - Supported via ValuationLayer
✔ **No quantity mutation bugs** - Quantities only change through movements
✔ **Same pattern used by** SAP / Odoo / Shopify
