

```prisma

// ========== This is demo, just for better understanding , we will remove it later =========



// ============== ORDER MODULE ==============
// Handles sales orders, pricing, and customer transactions
// Links to Stock module via StockMovement.referenceId

enum OrderStatus {
    DRAFT // Order created but not confirmed
    PENDING // Awaiting payment or approval
    CONFIRMED // Payment received, ready to fulfill
    PROCESSING // Being picked/packed
    SHIPPED // Sent to customer
    DELIVERED // Received by customer
    COMPLETED // Fully completed
    CANCELLED // Cancelled before completion
    REFUNDED // Money returned to customer
}

enum PaymentStatus {
    PENDING
    PARTIAL
    PAID
    REFUNDED
    FAILED
}

enum PaymentMethod {
    CASH
    CARD
    BANK_TRANSFER
    MOBILE_PAYMENT
    CREDIT // Store credit / account
}

// ============== ORDER ==============
// Main order header - one per transaction

model Order {
    id String @id @default(uuid())

    // Order identification
    orderNumber String @db.VarChar(50)

    // Status tracking
    status        OrderStatus   @default(DRAFT)
    paymentStatus PaymentStatus @default(PENDING)

    // Dates
    orderDate   DateTime  @default(now())
    confirmedAt DateTime?
    shippedAt   DateTime?
    deliveredAt DateTime?
    completedAt DateTime?
    cancelledAt DateTime?

    // Financial summary (denormalized for fast queries)
    subtotal       Decimal @db.Decimal(14, 4) // Sum of line totals before tax/discount
    taxAmount      Decimal @default(0) @db.Decimal(14, 4)
    discountAmount Decimal @default(0) @db.Decimal(14, 4)
    shippingAmount Decimal @default(0) @db.Decimal(14, 4)
    grandTotal     Decimal @db.Decimal(14, 4) // Final amount to pay

    // Payment tracking
    paidAmount    Decimal        @default(0) @db.Decimal(14, 4)
    paymentMethod PaymentMethod?

    // Shipping info (can be nullable for pickup)
    shippingAddress String?
    shippingCity    String? @db.VarChar(100)
    shippingCountry String? @db.VarChar(100)
    shippingZip     String? @db.VarChar(20)

    // Notes
    customerNote String? // Note from customer
    internalNote String? // Internal staff note

    // Customer relation
    customerId String?
    customer   Customer? @relation(fields: [customerId], references: [id], onDelete: SetNull)

    // Location (which warehouse fulfills this order)
    locationId String?
    location   Location? @relation(fields: [locationId], references: [id], onDelete: SetNull)

    // Tenant relation
    tenantId String
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    // Audit
    createdById String?
    createdBy   User?   @relation("OrderCreator", fields: [createdById], references: [id], onDelete: SetNull)

    // Relations
    items    OrderItem[]
    payments OrderPayment[]

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([orderNumber, tenantId])
    @@index([customerId])
    @@index([locationId])
    @@index([status])
    @@index([paymentStatus])
    @@index([orderDate])
    @@index([tenantId])
    @@index([createdById])
    @@map("orders")
}

// ============== ORDER ITEM ==============
// Line items - one per product in the order

model OrderItem {
    id String @id @default(uuid())

    // Quantities
    quantity     Int // Ordered quantity
    fulfilledQty Int @default(0) // Quantity shipped/delivered
    returnedQty  Int @default(0) // Quantity returned by customer

    // Pricing (at time of order - snapshot)
    unitPrice   Decimal @db.Decimal(12, 4) // Selling price per unit
    costPrice   Decimal @default(0) @db.Decimal(12, 4) // COGS per unit (filled after fulfillment)
    discountPct Decimal @default(0) @db.Decimal(5, 2) // Line discount percentage
    discountAmt Decimal @default(0) @db.Decimal(12, 4) // Line discount amount
    taxPct      Decimal @default(0) @db.Decimal(5, 2) // Tax percentage
    taxAmount   Decimal @default(0) @db.Decimal(12, 4) // Tax amount
    lineTotal   Decimal @db.Decimal(14, 4) // Final line amount (qty × price - discount + tax)

    // Profit calculation (filled after fulfillment)
    cogs        Decimal @default(0) @db.Decimal(14, 4) // Total COGS for this line
    grossProfit Decimal @default(0) @db.Decimal(14, 4) // lineTotal - cogs

    // Product snapshot (in case product is later modified)
    productName String @db.VarChar(255)
    productSku  String @db.VarChar(100)

    // Notes
    note String?

    // Product relation
    productId String
    product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)

    // Order relation
    orderId String
    order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@index([orderId])
    @@index([productId])
    @@map("order_items")
}

// ============== ORDER PAYMENT ==============
// Track multiple payments for an order (partial payments, refunds)

model OrderPayment {
    id String @id @default(uuid())

    amount        Decimal       @db.Decimal(14, 4)
    paymentMethod PaymentMethod
    isRefund      Boolean       @default(false) // True if this is a refund

    // External reference (transaction ID from payment gateway)
    transactionId String? @db.VarChar(255)
    note          String?

    // Order relation
    orderId String
    order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)

    // Tenant relation
    tenantId String
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    // Audit
    processedById String?
    processedBy   User?   @relation("PaymentProcessor", fields: [processedById], references: [id], onDelete: SetNull)

    createdAt DateTime @default(now())

    @@index([orderId])
    @@index([tenantId])
    @@index([createdAt])
    @@map("order_payments")
}

// ============== CUSTOMER ==============
// Customer master data

model Customer {
    id String @id @default(uuid())

    // Identification
    customerNumber String? @db.VarChar(50)

    // Contact info
    name        String  @db.VarChar(255)
    email       String? @db.VarChar(255)
    phone       String? @db.VarChar(50)
    companyName String? @db.VarChar(255)

    // Default address
    address String?
    city    String? @db.VarChar(100)
    country String? @db.VarChar(100)
    zipCode String? @db.VarChar(20)

    // Credit / payment terms
    creditLimit  Decimal @default(0) @db.Decimal(14, 4)
    paymentTerms Int     @default(0) // Days for payment (0 = immediate)

    // Status
    isActive Boolean @default(true)

    // Notes
    notes String?

    // Tenant relation
    tenantId String
    tenant   Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

    // Relations
    orders Order[]

    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt

    @@unique([email, tenantId])
    @@unique([customerNumber, tenantId])
    @@index([tenantId])
    @@index([name])
    @@index([isActive])
    @@map("customers")
}
