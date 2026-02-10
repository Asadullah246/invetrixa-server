
features : 

- Analytics:         	Dashboards, reports, trends
- Customers:         	CRUD + segmentation
- Products:         	Inventory, pricing, stock
- Orders:         	Sales workflow, returns
- Payments:         	Gateways, reconciliation
- Employees:         	Role, permissions, audit
- Company:         	Settings, branding
- Warehouse:         	Branch stock management
- Purchases:         	Suppliers, expenses
- Reports:         	Financial, export
- Integrations:       API, webhooks, apps





model UserSettings {
  id                 String   @id @default(cuid())
  userId             String   @unique
  language           String?  @default("en")
  timezone           String?  @default("UTC")
  theme              String?  @default("light")
  sidebarCollapsed   Boolean? @default(false)
  emailNotifications Boolean? @default(true)
  pushNotifications  Boolean? @default(true)
  weeklySummary      Boolean? @default(true)
  twoFactorEnabled   Boolean? @default(false)
  defaultCurrency    String?  @default("USD")
  dateFormat         String?  @default("YYYY-MM-DD")
  numberFormat       String?  @default("1,234.56")
  defaultTenantId    String?
  dashboardLayout    Json?
  shortcuts          Json?
  recentActivity     Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])
}

model UserTenantSettings {
  id                 String   @id @default(cuid())
  userId             String
  tenantId           String
  role               String   @default("member")
  tenantNotifications Boolean? @default(true)
  landingPage        String?  @default("dashboard")
  customPermissions  Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id])
  tenant Tenant @relation(fields: [tenantId], references: [id])

  @@unique([userId, tenantId])
}




tenant :




**Company**

1. id
2. name
3. legalName
4. companyType
5. registrationNumber
6. taxId
7. vatNumber
8. businessEmail
9. businessPhone
10. website
11. address
12. industry
13. businessDescription
14. establishedYear
15. logo
16. timezone
17. status (active, inactive, suspended)
18. createdAt
19. updatedAt

**Company Config**

1. id
2. companyId
3. currency
4. pricingMethod (lifo, fifo, wac, average)
5. timezone
6. dateFormat
7. numberFormat
8. language
9. createdAt
10. updatedAt



### location 


model Location {
  id             String   @id @default(cuid())
  companyId      String
  parentId       String?  // for warehouse under shop or sub-location
  name           String
  type           LocationType
  subType        LocationSubType
  address        Json?      // street, city, state, zip, country
  phone          String?
  email          String?
  businessHours  Json?      // only for shops
  totalCapacity  Float?     // sqft, only for warehouse
  usedCapacity   Float?     // sqft, only for warehouse
  status         LocationStatus @default(ACTIVE)
  settings       Json?      // currency, language, timezone, etc.
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  company        Company @relation(fields: [companyId], references: [id])
  parent         Location? @relation("LocationHierarchy", fields: [parentId], references: [id])
  children       Location[] @relation("LocationHierarchy")

  // relations with operations
  stocks         Stock[]
  transfersFrom  StockTransfer[] @relation("TransferFrom")
  transfersTo    StockTransfer[] @relation("TransferTo")
}

enum LocationType {
  SHOP
  WAREHOUSE
}

enum LocationSubType {
  ONLINE
  PHYSICAL
  HYBRID
  STORAGE
  FULFILLMENT
  RETAIL
}

enum LocationStatus {
  ACTIVE
  INACTIVE
  CLOSED
}





| Type          | Typical Jobs              | Description                             |
| ------------- | ------------------------- | --------------------------------------- |
| **Shop**      | POS sales                 | Sell to customers (walk-in / online)    |
|               | Order fulfillment         | Handle pickup or delivery orders        |
|               | Return management         | Accept returns or refunds               |
|               | Local stock tracking      | Keep its own stock quantity             |
|               | Staff management          | Assign employees to this shop           |
|               | Business hours & status   | Used for scheduling                     |
| **Warehouse** | Receive purchase orders   | Accept inventory from suppliers         |
|               | Stock storage             | Maintain large inventory                |
|               | Stock transfer            | Send items to shops or other warehouses |
|               | Batch and expiry tracking | For perishable goods                    |
|               | Capacity monitoring       | Track total vs used space               |
|               | Fulfillment center        | For online order shipments              |






**Customer**

1. id
2. companyId
3. firstName
4. lastName
5. email
6. phone
7. address
8. dateOfBirth
9. companyName (for business customers)
10. customerType (individual, business)
11. status (active, inactive)
12. createdAt
13. updatedAt




### order/payment :


## quote 

model Quote {
  id             String   @id @default(cuid())
  companyId      String
  customerId     String
  locationId     String?
  quoteNumber    String   @unique
  status         QuoteStatus @default(DRAFT)
  validUntil     DateTime?
  totalAmount    Decimal   @default(0)
  taxAmount      Decimal   @default(0)
  discountAmount Decimal   @default(0)
  notes          String?
  createdById    String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  items          QuoteItem[]
}

model QuoteItem {
  id          String   @id @default(cuid())
  quoteId     String
  productId   String
  quantity    Int
  unitPrice   Decimal
  discount    Decimal? @default(0)
  totalPrice  Decimal
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  quote       Quote    @relation(fields: [quoteId], references: [id])
}

enum QuoteStatus {
  DRAFT
  SENT
  ACCEPTED
  REJECTED
  EXPIRED
}



## invoice 

model Invoice {
  id             String   @id @default(cuid())
  companyId      String
  customerId     String
  quoteId        String?   // optional, if converted from quote
  invoiceNumber  String    @unique
  status         InvoiceStatus @default(DRAFT)
  issueDate      DateTime
  dueDate        DateTime?
  totalAmount    Decimal
  taxAmount      Decimal
  discountAmount Decimal
  paidAmount     Decimal   @default(0)
  balanceDue     Decimal   @default(0)
  notes          String?
  paymentStatus  PaymentStatus @default(PENDING)
  createdById    String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  items          InvoiceItem[]
  payments       Payment[]
  order          Order?
}

model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String
  productId   String
  quantity    Int
  unitPrice   Decimal
  discount    Decimal? @default(0)
  totalPrice  Decimal
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
}

enum InvoiceStatus {
  DRAFT
  SENT
  PARTIAL
  PAID
  CANCELLED
}

## Order 


model Order {
  id              String   @id @default(cuid())
  companyId       String
  invoiceId       String?
  customerId      String
  locationId      String
  orderNumber     String   @unique
  orderDate       DateTime @default(now())
  expectedDeliveryDate DateTime?
  status          String
  totalAmount     Decimal
  taxAmount       Decimal
  discountAmount  Decimal
  currency        String   @default("USD")
  paymentStatus   String
  paymentMethod   String
  shippingAddress Json
  billingAddress  Json
  shippingMethod  String
  trackingNumber  String?
  notes           String?
  source          String? // POS, Web, Mobile
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  items           OrderItem[]
    payments       Payment[]
}

model OrderItem {
  id          String   @id @default(cuid())
  orderId     String
  productId   String
  variantId   String?   // child product if using variants
  batchId     String?   // optional batch reference
  quantity    Int
  unitPrice   Decimal
  totalPrice  Decimal
  taxAmount   Decimal?
  discountAmount Decimal?
  attributes  Json?     // e.g., { color: "red", size: "L" }
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  order       Order     @relation(fields: [orderId], references: [id])
}


enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
}


## payment 

model Payment {
  id              String   @id @default(cuid())
  companyId       String
  orderId         String?
  invoiceId       String?
  method          PaymentMethodType
  transactionId   String? // gateway transaction ID
  amount          Decimal
  currency        String   @default("BDT")
  status          PaymentStatus @default(PENDING)
  reference       String?  // for cash/cheque/posRef
  processedById   String?  // employee
  processedAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  order           Order?   @relation(fields: [orderId], references: [id])
  invoice         Invoice? @relation(fields: [invoiceId], references: [id])
}

enum PaymentMethodType {
  CASH
  CARD
  MOBILE
  BANK_TRANSFER
  POS
  ONLINE_GATEWAY
  OTHER
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}

## refund 

model Refund {
  id             String   @id @default(cuid())
  paymentId      String
  amount         Decimal
  reason         String?
  status         RefundStatus @default(PENDING)
  processedById  String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  payment        Payment  @relation(fields: [paymentId], references: [id])
}

enum RefundStatus {
  PENDING
  APPROVED
  REJECTED
  COMPLETED
}




## steps


payment/orders :
1. manual payment 
- create direct order ( example : pos machine that work with direct bank )
- create invoice >> confirm
- create quote >> invoice >> confirm


### updated ways : 

- creating quote/invoice
- direct payment



## for creating quote/invoice 

- create quote > invoice > confirm > order creation> payment record(full or partial). if the payment is partial, the status of invoice is partial

- payment collection method : cash, bank transfer, card payment( pos machine( direct bank machine or backend api connected machine))


## direct payment : 

- create direct order > payment record( full or partial)




subjects : 
- pos machine
- payment handling like full , partial, invoicing or not 


2. pos machine payment:
- customer select the products > product selected in pos machine via qr code scan machine > customer swap card > payment recived > webhook proived to backend > backend create order based on the given product informations



