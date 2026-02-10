


## reservation api demo :

model StockReservation {
  id            String   @id
  locationId    String
  expiresAt     DateTime
  status        ReservationStatus
  referenceType String?
  referenceId   String?
  // ... tenant, createdBy, etc.
  items         StockReservationItem[]
}

model StockReservationItem {
  id            String
  reservationId String
  reservation   StockReservation
  productId     String
  quantity      Int
}








# flow :

* register > auto login > check if any pending invitation exist or not > if exist, accept it > update optional profile preference and do onboarding completed > redirect to dashboard > else, redirect to onboarding > update onboarding completed(tenant creation, optional tenant setting and optional profile preference) > redirect to dashboard 

* login > check if any pending invitation exist or not > if exist, accept it > update optional profile preference and do onboarding completed > redirect to dashboard > else, redirect to onboarding > update onboarding completed(tenant creation, optional tenant setting and optional profile preference) > redirect to dashboard 

* before going dashboard, need to choose the tenant:
  call the teanant getting api, get single or get my all tenant.
  check localstorage or any other storage if any tenant id exist or not, 
  if exist, call the tenant getting api with that tenant id as query, if got and accessible for this user, then redirect to the dashboard selecting this tenant.
  else, call the get all my tenants api, choose any tenant from the got list or autometically select the first tenant and redirect to the dashboard selecting this tenant.
  



so need apis :
- login
- register
- get invitations for this user
- accept invitation
- decline invitation
- create tenant
- update tenant settings
- update optional profile preference
- tenant single getting api
- my all tenant getting api





charge list :

## pay per use charging:

- per product adding
- per sale
-

today works:

- completed tenant module, resolved create , update api and created delete, get apis
- updated dtos and response types
- updated prisma fields as needed
- worked on access-control

update :

- remove action table from mdoule and

task :

- user
- onboarding
- tenant
- access control



invitation flow :
> superadmin/admin create an invitation
> backend save the data to database and send a email to this email with tenant name, role , message
> employee click the link like pxlhut.com/invitaions/view/token
> if the user not logged in, need to login/register and see the invitation page with necessary data ( tenant name, role, message) and accept, decline button
> if accepted, UserAssignment data will be created in database
> if declined, tenant invitation will be updated as declined

> 


## todos :



hibrid system :

model Role {
id String @id @default(cuid())
name String // e.g., Manager, Cashier
description String?
tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id])
createdAt DateTime @default(now())

// What this role can do
rolePermissions RolePermission[]

// Link to users per location
userAssignments UserAssignment[]
}

model RolePermission {
id String @id @default(cuid())
roleId String
resource String // e.g., Product, Customer, Order
actions String[] // ["create","update","delete","view"]

role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

@@index([roleId, resource])
}

// -----------------------
// ASSIGN USER TO ROLE + LOCATION
// -----------------------
model UserAssignment {
id String @id @default(cuid())
userId String
roleId String
locationId String
assignedAt DateTime @default(now())

user User @relation(fields: [userId], references: [id], onDelete: Cascade)
role Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
location Location @relation(fields: [locationId], references: [id], onDelete: Cascade)

@@unique([userId, roleId, locationId]) // prevent duplicate assignment
}

// -----------------------
// OPTIONAL: USER ATTRIBUTES FOR ABAC
// -----------------------
model UserAttribute {
id String @id @default(cuid())
userId String
key String // e.g., clearance, department
value String

user User @relation(fields: [userId], references: [id], onDelete: Cascade)
@@unique([userId, key])
}

// -----------------------
// TENANT & LOCATION
// -----------------------
model Tenant {
id String @id @default(cuid())
name String
createdAt DateTime @default(now())
locations Location[]
users User[]
roles Role[]
}

model Location {
id String @id @default(cuid())
name String
tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id])
createdAt DateTime @default(now())

userAssignments UserAssignment[]
}

// -----------------------
// USERS & ROLES
// -----------------------
model User {
id String @id @default(cuid())
name String
email String @unique
tenantId String
tenant Tenant @relation(fields: [tenantId], references: [id])
createdAt DateTime @default(now())

// Attribute for ABAC extension (optional)
attributes UserAttribute[]

// Role assignments per location
userAssignments UserAssignment[]
}

// permission-map.ts

export const PermissionMap = {
// 🏪 Tenant & Setup
'/api/tenants': 'tenant_management',
'/api/locations': 'location_management',
'/api/settings': 'system_settings',

// 👥 Users & Roles
'/api/users': 'employee_management',
'/api/roles': 'role_management',
'/api/assignments': 'user_assignment_management',

// 📦 Inventory Management
'/api/products': 'product_management',
'/api/categories': 'product_management',
'/api/brands': 'product_management',
'/api/variants': 'product_management',
'/api/inventory': 'inventory_management',
'/api/stock-adjustments': 'inventory_management',

// 🚚 Warehouse / Branch Management
'/api/warehouses': 'warehouse_management',
'/api/transfers': 'warehouse_transfer_management',

// 💳 POS & Sales
'/api/pos': 'pos_management',
'/api/orders': 'order_management',
'/api/invoices': 'order_management',
'/api/payments': 'payment_management',

// 👥 Customers & Suppliers
'/api/customers': 'customer_management',
'/api/suppliers': 'supplier_management',

// 📈 Reports & Analytics
'/api/reports/sales': 'sales_reporting',
'/api/reports/inventory': 'inventory_reporting',
'/api/reports/finance': 'finance_reporting',
'/api/analytics': 'analytics',

// ⚙️ System Utilities
'/api/audit-logs': 'audit_logging',
'/api/notifications': 'notification_management',
'/api/files': 'file_management',

// 🌍 Integrations (Stripe, PayPal, SSLCOMMERZ, etc.)
'/api/integrations': 'integration_management',
'/api/webhooks': 'integration_management',

// 🧾 Accounting & Ledger
'/api/accounts': 'accounting_management',
'/api/transactions': 'accounting_management',

// 🧠 Access Control
'/api/policies': 'access_control_management',

// 🚀 Dashboard
'/api/dashboard': 'dashboard_view',
};

1. default and separate subscription options
2. dept of

{
"id": 101,
"name": "Editor can only edit product in own tenant if price <= 100",
"action": "update:product",
"effect": "allow",
"subject": { "role": ["editor"] },
"resource": {
"tenantId": { "op": "eq", "valueFrom": "user.tenantId" },
"price": { "op": "lte", "value": 100 }
},
"environment": {}
}

| Attribute    | Example                                  | Purpose                           |
| ------------ | ---------------------------------------- | --------------------------------- |
| `role`       | admin, editor, accountant, sales_manager | Basic role                        |
| `tenantId`   | "t001"                                   | Which company/org user belongs to |
| `department` | sales, inventory, hr                     | Department-level control          |
| `region`     | "BD", "US"                               | Regional access                   |
| `userId`     | 123                                      | Used for “own data only” rules    |

model Policy {
id Int @id @default(autoincrement())
name String
action String
effect String
subject_json Json
resource_json Json?
environment_json Json?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
}

we have suppose :

- products (add stock, stock movement)
- warehouse
- creating quote/invoice
- creating orders

possible attribtues :

- userId
- role
- tenantid
- department
- region

### attribute/permission creation:

?? how the owner will be the owner of a tenant ??

# owner want to add a/some employee to product creation job

possible created data :

- id
- tenantId
- action - string - `create_product`
- effect - string - `allow` or `deny`
- subject - json - json { "userId": { "op": "in", "value": ["emp_101", "emp_102", "emp_103"] }, "tenantId": { "op": "eq", "value": "tenant_123" } }
- resource - json - json { "tenantId": { "op": "eq", "value": "tenant_123" } }

| Field            | Type     | Description                        |
| ---------------- | -------- | ---------------------------------- |
| id               | int      | primary key                        |
| tenant_id        | string   | which tenant the policy belongs to |
| action           | string   | e.g., `"create_product"`           |
| effect           | string   | `"allow"` or `"deny"`              |
| subject_json     | JSON     | defines user conditions            |
| resource_json    | JSON     | defines resource conditions        |
| environment_json | JSON     | optional time/location conditions  |
| created_by       | string   | who created it (owner)             |
| created_at       | datetime | timestamp                          |

| Field                | Example Value                                                             |
| -------------------- | ------------------------------------------------------------------------- |
| **tenant_id**        | `"tenant_123"`                                                            |
| **action**           | `"create_product"`                                                        |
| **effect**           | `"allow"`                                                                 |
| **subject_json**     | `json { "role": { "op": "in", "value": ["owner", "product_creator"] } } ` |
| **resource_json**    | `json { "tenantId": { "op": "eq", "value": "tenant_123" } } `             |
| **environment_json** | `null`                                                                    |
| **created_by**       | `"owner_123"`                                                             |

policy call using :
{
tenant_id,
action ( example: "create_product" ),
},

### in https://app.permit.io :

they have :

- high level attribute( admin, editor, etc.)

flowchart TD
A[User Registration] --> B[Login]
B --> C[Receive Cookies: Access & Refresh Tokens]
C --> D[Request Protected Resource]
D --> E{Access Token Valid?}
E -- Yes --> F[Allow Action & Check ABAC Policy]
E -- No --> G[Refresh Token Flow]
G --> H{Refresh Token Valid?}
H -- Yes --> I[Issue New Access Token]
H -- No --> J[User Re-login]
F --> K[Execute Route Handler]
K --> L[ABAC Guard Checks Permissions]
L -- Allowed --> M[Perform Action]
L -- Denied --> N[403 Forbidden]
B --> O[Logout]
O --> P[Clear Cookies]

src/
│
├── main.ts # Nest app bootstrap
├── app.module.ts # Root module
│
├── config/ # ✅ Configurations (database, jwt, etc.)
│ ├── database.config.ts
│ ├── jwt.config.ts
│ └── env.config.ts
│
├── infrastructure/ # ✅ Infrastructure layer
│ ├── prisma/
│ │ ├── prisma.service.ts # PrismaService (explained below)
│ │ ├── prisma.module.ts
│ │ └── migrations/ # Prisma migrations
│ └── generated/
│ └── prisma/ # Auto-generated Prisma Client
│
├── auth/ # ✅ Authentication (Passport, JWT)
│ ├── auth.module.ts
│ ├── auth.service.ts
│ ├── auth.controller.ts
│ ├── jwt.strategy.ts
│ ├── jwt.constants.ts
│ └── dto/
│ ├── login.dto.ts
│ ├── register.dto.ts
│
├── abac/ # ✅ Attribute Based Access Control
│ ├── abac.module.ts
│ ├── abac.service.ts
│ ├── abac.guard.ts
│ ├── policy.decorator.ts
│
├── common/ # ✅ Common utilities
│ ├── guards/
│ │ └── jwt-auth.guard.ts
│ ├── interceptors/
│ ├── filters/
│ ├── decorators/
│ ├── middlewares/
│ │ └── resource-loader.middleware.ts
│ ├── utils/
│
├── domain/ # ✅ Domain models or entities (business logic)
│ ├── user.entity.ts
│ ├── order.entity.ts
│
├── modules/ # ✅ Core application modules
│ ├── users/
│ │ ├── users.module.ts
│ │ ├── users.service.ts
│ │ ├── users.controller.ts
│ │ ├── dto/
│ │ └── ...
│ ├── orders/
│ │ ├── orders.module.ts
│ │ ├── orders.service.ts
│ │ ├── orders.controller.ts
│ │ ├── dto/
│
├── shared/ # ✅ Shared reusable services/helpers
│ ├── mail/
│ ├── cache/
│
├── tests/
│ └── e2e/
│
└── prisma/
└── schema.prisma # Prisma schema

import { Controller, UseGuards, Post, Body } from '@nestjs/common';
import { AbacGuard, AbacAction } from '../common/abac';

@Controller('users')
@UseGuards(AbacGuard) // Apply to all routes in this controller
export class UserController {
constructor(private userService: UserService) {}

@Post()
@AbacAction('create_user', 'User') // Specify required action and resource
async createUser(@Body() createUserDto: CreateUserDto) {
return this.userService.create(createUserDto);
}

@Get(':id')
@AbacAction('read_user', 'User')
async getUser(@Param('id') id: string) {
return this.userService.findOne(id);
}
}

https://portpos.com/
