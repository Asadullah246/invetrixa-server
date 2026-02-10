export const MODULESREF = [
  {
    name: 'Module',
    description: 'Manage modules',
    actions: ['module.view'],
  },
  {
    name: 'Role',
    description: 'Manage roles',
    actions: [
      'role.create',
      'role.view',
      'role.update',
      'role.delete',
      'role.assign',
      'role.unassign',
    ],
  },
  {
    name: 'Tenant',
    description: 'Manage tenants',
    actions: [
      'tenant.view',
      'tenant.update',
      'tenant.delete',
      'tenant.invitation.create',
      'tenant.invitation.update',
      'tenant.invitation.cancel',
      'tenant.invitation.view',
      'tenant.member.remove',
    ],
  },
  {
    name: 'User',
    description: 'Manage users',
    actions: ['user.view'],
  },
  {
    name: 'Category',
    description: 'Manage categories',
    actions: [
      'category.create',
      'category.view',
      'category.update',
      'category.delete',
    ],
  },
  {
    name: 'Product',
    description: 'Manage products',
    actions: [
      'product.create',
      'product.view',
      'product.update',
      'product.delete',
    ],
  },
  {
    name: 'Supplier',
    description: 'Manage suppliers',
    actions: [
      'supplier.create',
      'supplier.view',
      'supplier.update',
      'supplier.delete',
    ],
  },
  {
    name: 'Location',
    description: 'Manage warehouse and storage locations',
    actions: [
      'location.create',
      'location.view',
      'location.update',
      'location.delete',
    ],
  },
  {
    name: 'Stock',
    description: 'Manage stock movements and adjustments',
    actions: ['stock.movement.create', 'stock.movement.view'],
  },
  {
    name: 'Inventory',
    description: 'Manage inventory balances, transfers, and valuations',
    actions: [
      // Balances
      'stock.view',
      'stock.valuation.view',
      // Transfers
      'transfer.create',
      'transfer.view',
      'transfer.ship',
      'transfer.receive',
      'transfer.cancel',
      // Reservations
      'reservation.create',
      'reservation.view',
      'reservation.update',
      'reservation.delete',
    ],
  },
  {
    name: 'Customer',
    description: 'Manage customers and their addresses',
    actions: [
      'customer.create',
      'customer.view',
      'customer.update',
      'customer.delete',
    ],
  },
];

export const ROLE_PERMISSIONS = {
  // ===== TENANT CONTEXT =====
  TENANT: {
    SuperAdmin: {
      Role: 'ALL',
      User: 'ALL',
      Tenant: 'ALL',
      Category: 'ALL',
      Product: 'ALL',
      Supplier: 'ALL',
      Location: 'ALL',
      Stock: 'ALL',
      Inventory: 'ALL',
      Customer: 'ALL',
    },
    Admin: {
      Role: ['role.view', 'role.update'],
      User: ['user.view', 'user.list', 'user.update'],
      Category: ['category.view', 'category.update'],
      Product: ['product.view', 'product.update'],
      Supplier: ['supplier.view', 'supplier.update'],
      Location: ['location.view', 'location.update'],
      Stock: ['stock.movement.view'],
      Inventory: ['stock.view', 'stock.valuation.view', 'transfer.view'],
      Customer: ['customer.view', 'customer.update'],
    },
    Editor: {
      Tenant: ['tenant.view'],
    },
  },

  // ===== ADMINISTRATOR CONTEXT =====
  ADMIN: {
    SuperAdmin: {
      Module: 'ALL',
      Role: 'ALL',
      User: 'ALL',
      Tenant: 'ALL',
      Category: 'ALL',
      Product: 'ALL',
      Supplier: 'ALL',
      Location: 'ALL',
      Stock: 'ALL',
      Inventory: 'ALL',
      Customer: 'ALL',
    },
    Admin: {
      User: ['user.view', 'user.update'],
      Tenant: ['tenant.create', 'tenant.update'],
      Category: ['category.view', 'category.update'],
      Product: ['product.view', 'product.update'],
      Supplier: ['supplier.view', 'supplier.update'],
      Location: ['location.view', 'location.update'],
      Stock: ['stock.movement.view'],
      Inventory: ['stock.view', 'stock.valuation.view', 'transfer.view'],
      Customer: ['customer.view', 'customer.update'],
    },
    Editor: {
      Tenant: ['tenant.view'],
    },
  },
} as const;

export function resolveActions(
  moduleName: string,
  roleConfig: 'ALL' | readonly string[],
  moduleActions: string[],
): string[] {
  return roleConfig === 'ALL' ? moduleActions : [...roleConfig];
}
