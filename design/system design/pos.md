POS System Integration - Professional Implementation Plan
Overview
This plan outlines a production-ready POS (Point of Sale) module for your multi-tenant inventory management system. The design leverages your existing architecture patterns while implementing industry-standard POS best practices.

Core POS Architecture
Background Jobs
Existing Modules
POS Module
POS Terminal
Sale Service
Cart Manager
Payment Processor
Receipt Generator
Stock Module
Customer Module
Product Module
Location Module
Receipt Email Queue
Daily Sales Report
End of Day Reconciliation
User Review Required
IMPORTANT

Payment Gateway Integration: This plan provides an abstracted payment interface. You'll need to specify which payment gateways to integrate (Stripe, Square, PayPal, local gateways, etc.) before the payment processing implementation phase.

WARNING

Hardware Integration Scope: POS hardware (barcode scanners, receipt printers, cash drawers) typically requires frontend integration and device-specific SDKs. This plan covers the backend API only. Frontend/hardware integration would be a separate phase.

CAUTION

Offline Mode: Full offline POS capability requires significant frontend architecture (IndexedDB, service workers, sync queues). This plan covers online-first operation with a sync queue foundation for future offline support.

Database Schema Design
New Enums (prisma/schemas/pos.prisma)
enum SaleStatus {
DRAFT // Cart in progress
PENDING // Awaiting payment
COMPLETED // Fully paid
PARTIALLY_PAID // Partial payment received
VOIDED // Cancelled/voided
REFUNDED // Fully refunded
PARTIALLY_REFUNDED
}
enum PaymentMethod {
CASH
CARD
MOBILE_WALLET
BANK_TRANSFER
CREDIT // Store credit
SPLIT // Multiple methods
}
enum PaymentStatus {
PENDING
COMPLETED
FAILED
REFUNDED
PARTIALLY_REFUNDED
}
enum DiscountType {
PERCENTAGE
FIXED_AMOUNT
}
enum DiscountScope {
ITEM // Applied to specific line item
CART // Applied to entire cart
}
enum POSSessionStatus {
OPEN
CLOSED
RECONCILING
}
Core Models
// POS Terminal/Register Configuration
model POSTerminal {
id String @id @default(uuid())
name String @db.VarChar(100) // "Register 1", "Checkout A"
code String @db.VarChar(20) // "POS-001"
isActive Boolean @default(true)

// Location binding
locationId String
location Location @relation(fields: [locationId], references: [id])

// Tenant relation
tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

// Relations
sessions POSSession[]
sales Sale[]

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([code, tenantId])
@@index([locationId])
@@index([tenantId])
@@map("pos_terminals")
}
// Cash drawer session management
model POSSession {
id String @id @default(uuid())
sessionNumber String @db.VarChar(50) // Auto-generated

// Opening/Closing balances
openingBalance Decimal @db.Decimal(15, 4)
closingBalance Decimal? @db.Decimal(15, 4)
expectedBalance Decimal? @db.Decimal(15, 4) // Calculated from sales
variance Decimal? @db.Decimal(15, 4) // Difference (shortage/overage)

status POSSessionStatus @default(OPEN)

// Timestamps
openedAt DateTime @default(now())
closedAt DateTime?

// Cash counts (JSON for flexibility)
openingCount Json? // { "100": 5, "50": 10, ... }
closingCount Json?

notes String?

// Relations
terminalId String
terminal POSTerminal @relation(fields: [terminalId], references: [id])

openedById String
openedBy User @relation("SessionOpener", fields: [openedById], references: [id])

closedById String?
closedBy User? @relation("SessionCloser", fields: [closedById], references: [id])

tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

sales Sale[]

@@unique([sessionNumber, tenantId])
@@index([terminalId])
@@index([status])
@@index([tenantId])
@@map("pos_sessions")
}
// Main Sale record
model Sale {
id String @id @default(uuid())
saleNumber String @db.VarChar(50) // Invoice/receipt number

// Amounts (all in tenant's currency)
subtotal Decimal @db.Decimal(15, 4) // Before discounts & tax
discountAmount Decimal @default(0) @db.Decimal(15, 4)
taxAmount Decimal @default(0) @db.Decimal(15, 4)
totalAmount Decimal @db.Decimal(15, 4) // Final amount
paidAmount Decimal @default(0) @db.Decimal(15, 4)
changeAmount Decimal @default(0) @db.Decimal(15, 4)

status SaleStatus @default(DRAFT)

// Optional customer (walk-in sales don't require customer)
customerId String?
customer Customer? @relation(fields: [customerId], references: [id])

// Location where sale occurred
locationId String
location Location @relation(fields: [locationId], references: [id])

// POS Terminal & Session
terminalId String
terminal POSTerminal @relation(fields: [terminalId], references: [id])

sessionId String?
session POSSession? @relation(fields: [sessionId], references: [id])

// Cashier who processed
cashierId String
cashier User @relation("SaleCashier", fields: [cashierId], references: [id])

// Cart-level discount
discountType DiscountType?
discountValue Decimal? @db.Decimal(15, 4)
discountReason String? @db.VarChar(255)

// Metadata
notes String?
metadata Json? // For extensibility

// Timestamps
createdAt DateTime @default(now())
completedAt DateTime?
voidedAt DateTime?

voidedById String?
voidedBy User? @relation("SaleVoider", fields: [voidedById], references: [id])
voidReason String?

// Tenant
tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

// Relations
items SaleItem[]
payments SalePayment[]
refunds SaleRefund[]

@@unique([saleNumber, tenantId])
@@index([customerId])
@@index([locationId])
@@index([terminalId])
@@index([sessionId])
@@index([cashierId])
@@index([status])
@@index([createdAt])
@@index([tenantId])
@@map("sales")
}
// Line items in a sale
model SaleItem {
id String @id @default(uuid())

quantity Int
unitPrice Decimal @db.Decimal(15, 4) // Price at time of sale
unitCost Decimal @db.Decimal(12, 4) // COGS (from valuation layer)

// Line-level discount
discountType DiscountType?
discountValue Decimal? @db.Decimal(15, 4)
discountAmount Decimal @default(0) @db.Decimal(15, 4)

taxRate Decimal @default(0) @db.Decimal(5, 4)
taxAmount Decimal @default(0) @db.Decimal(15, 4)

lineTotal Decimal @db.Decimal(15, 4) // Final line amount

// For variant display
productName String @db.VarChar(255) // Snapshot at sale time
productSku String @db.VarChar(100)
attributes Json? // { "Color": "Red", "Size": "M" }

notes String?

// Product relation
productId String
product Product @relation(fields: [productId], references: [id])

// Sale relation
saleId String
sale Sale @relation(fields: [saleId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())

@@index([saleId])
@@index([productId])
@@map("sale_items")
}
// Payment records (supports split payments)
model SalePayment {
id String @id @default(uuid())

amount Decimal @db.Decimal(15, 4)
method PaymentMethod
status PaymentStatus @default(PENDING)

// For card/digital payments
transactionRef String? @db.VarChar(255)
gatewayResponse Json?

// For cash
receivedAmount Decimal? @db.Decimal(15, 4) // Amount given by customer
changeGiven Decimal? @db.Decimal(15, 4)

// Metadata
notes String?

processedAt DateTime @default(now())

// Relations
saleId String
sale Sale @relation(fields: [saleId], references: [id], onDelete: Cascade)

processedById String
processedBy User @relation("PaymentProcessor", fields: [processedById], references: [id])

@@index([saleId])
@@index([method])
@@index([status])
@@map("sale_payments")
}
// Refunds (partial or full)
model SaleRefund {
id String @id @default(uuid())
refundNumber String @db.VarChar(50)

amount Decimal @db.Decimal(15, 4)
method PaymentMethod
status PaymentStatus @default(PENDING)

reason String @db.VarChar(500)

// Optionally link to specific items being refunded
items Json? // [{ saleItemId, quantity, amount }]

processedAt DateTime @default(now())

saleId String
sale Sale @relation(fields: [saleId], references: [id])

processedById String
processedBy User @relation("RefundProcessor", fields: [processedById], references: [id])

tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

@@unique([refundNumber, tenantId])
@@index([saleId])
@@index([tenantId])
@@map("sale_refunds")
}
// Daily sales summary (denormalized for fast reporting)
model DailySalesSummary {
id String @id @default(uuid())
date DateTime @db.Date

totalSales Int @default(0)
totalRevenue Decimal @default(0) @db.Decimal(15, 4)
totalCOGS Decimal @default(0) @db.Decimal(15, 4)
totalDiscount Decimal @default(0) @db.Decimal(15, 4)
totalTax Decimal @default(0) @db.Decimal(15, 4)
totalRefunds Decimal @default(0) @db.Decimal(15, 4)

// By payment method
cashTotal Decimal @default(0) @db.Decimal(15, 4)
cardTotal Decimal @default(0) @db.Decimal(15, 4)
otherTotal Decimal @default(0) @db.Decimal(15, 4)

locationId String
location Location @relation(fields: [locationId], references: [id])

tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([date, locationId, tenantId])
@@index([date])
@@index([locationId])
@@index([tenantId])
@@map("daily_sales_summaries")
}
Proposed Changes
Database Schema
[NEW]
pos.prisma
All POS enums and models as shown above
Relations to existing Product, Customer, Location, User, Tenant models
[MODIFY]
product.prisma
Add SaleItem[] relation to Product model
[MODIFY]
customer.prisma
Add Sale[] relation to Customer model
[MODIFY]
location.prisma
Add POSTerminal[], Sale[], DailySalesSummary[] relations
[MODIFY]
tenant.prisma
Add POS-related relations
[MODIFY]
user.prisma
Add POS session, sale, payment, refund relations
POS Module Structure
[NEW] src/modules/pos/ - Complete module structure:
src/modules/pos/
├── pos.module.ts
├── pos.controller.ts # Main POS API endpoints
├── dto/
│ ├── index.ts
│ ├── cart/
│ │ ├── add-to-cart.dto.ts
│ │ ├── update-cart-item.dto.ts
│ │ ├── remove-from-cart.dto.ts
│ │ └── apply-discount.dto.ts
│ ├── sale/
│ │ ├── create-sale.dto.ts
│ │ ├── complete-sale.dto.ts
│ │ ├── void-sale.dto.ts
│ │ ├── query-sale.dto.ts
│ │ └── sale-response.dto.ts
│ ├── payment/
│ │ ├── process-payment.dto.ts
│ │ └── refund.dto.ts
│ ├── session/
│ │ ├── open-session.dto.ts
│ │ ├── close-session.dto.ts
│ │ └── session-response.dto.ts
│ └── terminal/
│ ├── create-terminal.dto.ts
│ ├── update-terminal.dto.ts
│ └── terminal-response.dto.ts
├── services/
│ ├── index.ts
│ ├── cart.service.ts # Cart/draft sale management
│ ├── sale.service.ts # Sale lifecycle
│ ├── payment.service.ts # Payment processing
│ ├── session.service.ts # POS session management
│ ├── terminal.service.ts # Terminal CRUD
│ ├── receipt.service.ts # Receipt generation
│ └── reporting.service.ts # Sales reports & analytics
├── queue/
│ ├── pos.processor.ts # BullMQ job processor
│ └── pos.jobs.ts # Job definitions
└── interfaces/
└── payment-gateway.interface.ts # Abstracted payment gateway
Key Services Implementation
CartService (src/modules/pos/services/cart.service.ts)
Core operations:

createCart() - Initialize draft sale
addItem() - Add product with stock validation & reservation
updateItem() - Update quantity (adjust reservations)
removeItem() - Remove item (release reservation)
applyItemDiscount() - Line-level discount
applyCartDiscount() - Cart-level discount
clearCart() - Abandon cart (release all reservations)
calculateTotals() - Recalculate subtotal, tax, discounts, total
Stock Integration: Uses existing StockReservation model with referenceType: 'SALE' and auto-expiry via BullMQ.

SaleService (src/modules/pos/services/sale.service.ts)
Core operations:

completeSale() - Finalize sale, create stock movements (OUT), update inventory
voidSale() - Void completed sale, reverse stock movements
getSaleDetails() - Get sale with items, payments
findAll()

- List sales with filters (date range, status, cashier, etc.)
  getSaleHistory() - Customer purchase history
  generateSaleNumber() - Tenant-scoped sequential numbering
  COGS Calculation: Uses existing ValuationLayer consumption pattern (FIFO/LIFO based on tenant setting).

PaymentService (src/modules/pos/services/payment.service.ts)
Core operations:

processPayment() - Handle single or split payments
processCashPayment() - Calculate change
processCardPayment() - Integration with payment gateway
processRefund() - Full or partial refund with stock return
SessionService (src/modules/pos/services/session.service.ts)
Core operations:

openSession() - Open cash drawer session with opening balance
closeSession() - Calculate expected balance, record variance
getActiveSessions() - List open sessions
reconcile() - End-of-day reconciliation
ReportingService (src/modules/pos/services/reporting.service.ts)
Reports:

Daily sales summary
Sales by payment method
Sales by product/category
Cashier performance
Hourly sales patterns
Top-selling products
Profit margin analysis
API Endpoints

# Terminal Management

POST /pos/terminals - Create terminal
GET /pos/terminals - List terminals
GET /pos/terminals/:id - Get terminal
PATCH /pos/terminals/:id - Update terminal
DELETE /pos/terminals/:id - Deactivate terminal

# Session Management

POST /pos/sessions/open - Open session
POST /pos/sessions/close - Close session
GET /pos/sessions/active - Get active session for terminal
GET /pos/sessions/:id - Get session details
GET /pos/sessions - List sessions (with filters)

# Cart/Sale Management

POST /pos/cart - Create new cart (draft sale)
POST /pos/cart/:id/items - Add item to cart
PATCH /pos/cart/:id/items/:itemId - Update cart item
DELETE /pos/cart/:id/items/:itemId - Remove cart item
POST /pos/cart/:id/discount - Apply cart discount
DELETE /pos/cart/:id - Clear/abandon cart

# Checkout

POST /pos/sales/:id/payment - Process payment
POST /pos/sales/:id/complete - Complete sale
POST /pos/sales/:id/void - Void sale

# Sale Queries

GET /pos/sales - List sales (with filters)
GET /pos/sales/:id - Get sale details
GET /pos/sales/:id/receipt - Get receipt data

# Refunds

POST /pos/refunds - Create refund
GET /pos/refunds/:id - Get refund details

# Reports

GET /pos/reports/daily - Daily summary
GET /pos/reports/sales - Sales report (date range)
GET /pos/reports/products - Top products
GET /pos/reports/cashiers - Cashier performance
Access Control Integration
New permissions to add:

// POS Permissions
'pos:terminal:create',
'pos:terminal:read',
'pos:terminal:update',
'pos:terminal:delete',
'pos:session:open',
'pos:session:close',
'pos:session:read',
'pos:session:reconcile',
'pos:sale:create',
'pos:sale:read',
'pos:sale:void',
'pos:sale:discount', // Apply discounts
'pos:refund:create',
'pos:refund:read',
'pos:report:read',
Background Jobs (BullMQ)
// pos.jobs.ts
export const POS*QUEUE_NAME = 'pos';
export const POS_JOBS = {
SEND_RECEIPT_EMAIL: 'send-receipt-email',
UPDATE_DAILY_SUMMARY: 'update-daily-summary',
EXPIRE_CART: 'expire-cart',
AUTO_CLOSE_SESSIONS: 'auto-close-sessions',
GENERATE_EOD_REPORT: 'generate-eod-report',
} as const;
Implementation Phases
Phase 1: Core Foundation
Database schema (pos.prisma) + migrations
POSModule setup with dependency injection
Terminal CRUD service/controller
Session management service/controller
Phase 2: Cart & Sale Flow
CartService with stock reservation integration
SaleService with stock movement creation
Sale number generation
Basic payment processing (cash only initially)
Phase 3: Payment & Refunds
PaymentService abstraction
Split payment support
RefundService with stock return
Payment gateway interface (for future integrations)
Phase 4: Reports & Analytics
DailySalesSummary updates via BullMQ
ReportingService
Report endpoints
Phase 5: Polish & Testing
Comprehensive unit tests
Integration tests
End-to-end testing via browser/API
Receipt templates
Verification Plan
Automated Tests
Unit Tests (src/modules/pos/\**/\_.spec.ts):

# Run all POS unit tests

pnpm test -- --testPathPattern="pos.\*\\.spec"

# Run specific service tests

pnpm test -- --testPathPattern="cart.service.spec"
pnpm test -- --testPathPattern="sale.service.spec"
Integration Tests (test/integration/pos/):

# Run POS integration tests

pnpm test:integration -- --testPathPattern="pos"
Tests to create:

cart.service.spec.ts - Cart operations, stock reservation
sale.service.spec.ts - Sale completion, stock movement creation
payment.service.spec.ts - Payment processing, change calculation
session.service.spec.ts - Session open/close, reconciliation
pos.integration.spec.ts - Full sale flow integration test
Manual Verification
Database Migration: Run pnpm docker:migrate and verify all tables created
Terminal Setup: Create terminal via API, verify in Prisma Studio
Sale Flow:
Open session → Add items to cart → Check stock reserved → Complete payment → Verify stock movements
Refund Flow:
Complete sale → Process refund → Verify stock returns
Session Reconciliation:
Process multiple sales → Close session → Verify expected vs actual balance
Considerations
Scalability
Indexed queries on all filter fields
Denormalized DailySalesSummary for fast reporting
BullMQ for async report generation
Auditing
All sales are immutable once completed
Void operations create reversing entries, not deletions
Session tracking for cash accountability
Multi-tenant Safety
All queries include tenantId filter
Sale numbers are tenant-scoped
Location-bound terminals prevent cross-location errors
Questions for You
Payment Gateways: Which payment providers do you need? (Stripe, local gateways, etc.)
Receipt Format: Do you need physical receipt printing support, or digital receipts only?
Discount Rules: Should discounts require manager approval above certain thresholds?
Tax Calculation: Is tax-inclusive or tax-exclusive pricing the default?
Hold/Park Sales: Do you need ability to hold a sale and resume later?
Customer Display: Do you need customer-facing display support (show items, total)?
Priority: Would you like me to start with Phase 1 immediately, or do you want to discuss any design decisions first?
