import { Prisma } from 'generated/prisma/client';
import {
  ROLE_PERMISSIONS,
  resolveActions,
} from '@/modules/modules-definition/data/moduleAndDefaultPermittions.data';

type RoleContext = 'TENANT' | 'ADMIN';

interface InitializeRolesResult {
  rolesCreated: number;
  permissionsCreated: number;
}

interface SyncRolesResult {
  permissionsCreated: number;
  permissionsUpdated: number;
}

/**
 * Initialize all default roles and permissions for a new tenant.
 * Creates roles from scratch based on ROLE_PERMISSIONS configuration.
 *
 * @param tx - Prisma transaction client
 * @param tenantId - The tenant ID to initialize roles for
 * @param context - 'TENANT' for regular tenants, 'ADMIN' for administrator tenant
 * @returns Statistics about created roles and permissions
 */
export async function initializeDefaultRoles(
  tx: Prisma.TransactionClient,
  tenantId: string,
  context: RoleContext,
): Promise<InitializeRolesResult> {
  const roleConfigs = ROLE_PERMISSIONS[context];

  // Load all modules for permission mapping
  const modules = await tx.moduleRef.findMany({
    select: { id: true, name: true, actions: true },
  });
  const moduleMap = new Map(modules.map((m) => [m.name, m]));

  console.log(
    `📦 initializeDefaultRoles: Found ${modules.length} modules in database`,
  );
  console.log(`   Module names: ${modules.map((m) => m.name).join(', ')}`);

  let rolesCreated = 0;
  let permissionsCreated = 0;

  for (const [roleName, modulePermissions] of Object.entries(roleConfigs)) {
    // Create the role
    const role = await tx.role.create({
      data: {
        name: roleName,
        description: `${roleName} role`,
        tenantId,
      },
    });
    rolesCreated++;

    // Create permissions for each module in the role config
    for (const [moduleName, permission] of Object.entries(
      modulePermissions as Record<string, 'ALL' | readonly string[]>,
    )) {
      const module = moduleMap.get(moduleName);

      if (!module) {
        console.error(
          `❌ Module "${moduleName}" not found in database! Role "${roleName}" will be missing this permission.`,
        );
        continue;
      }

      const actions = resolveActions(moduleName, permission, module.actions);

      if (actions.length === 0) continue;

      await tx.rolePermission.create({
        data: {
          roleId: role.id,
          moduleRefId: module.id,
          actions,
        },
      });
      permissionsCreated++;
    }
  }

  return { rolesCreated, permissionsCreated };
}

/**
 * Sync existing roles with new modules added to MODULESREF.
 * Only updates roles that have 'ALL' permission configured.
 * Custom roles and roles with specific actions are left unchanged.
 *
 * @param tx - Prisma transaction client
 * @param tenantId - The tenant ID to sync roles for
 * @param context - 'TENANT' for regular tenants, 'ADMIN' for administrator tenant
 * @returns Statistics about created and updated permissions
 */
export async function syncRolesWithModules(
  tx: Prisma.TransactionClient,
  tenantId: string,
  context: RoleContext,
): Promise<SyncRolesResult> {
  const roleConfigs = ROLE_PERMISSIONS[context];
  const defaultRoleNames = Object.keys(roleConfigs);

  // Load all modules
  const modules = await tx.moduleRef.findMany({
    select: { id: true, name: true, actions: true },
  });
  const moduleMap = new Map(modules.map((m) => [m.name, m]));

  // Find existing roles that match default role names
  const roles = await tx.role.findMany({
    where: {
      tenantId,
      name: { in: defaultRoleNames },
    },
    select: { id: true, name: true },
  });

  let permissionsCreated = 0;
  let permissionsUpdated = 0;

  for (const role of roles) {
    const roleConfig = roleConfigs[role.name as keyof typeof roleConfigs];
    if (!roleConfig) continue;

    // Process each module in the role configuration
    for (const [moduleName, permission] of Object.entries(roleConfig)) {
      // Only sync modules with 'ALL' permission
      if (permission !== 'ALL') continue;

      const module = moduleMap.get(moduleName);
      if (!module) continue;

      // Check if permission already exists
      const existingPermission = await tx.rolePermission.findUnique({
        where: {
          roleId_moduleRefId: {
            roleId: role.id,
            moduleRefId: module.id,
          },
        },
        select: { id: true, actions: true },
      });

      const allActions = module.actions;

      if (existingPermission) {
        // Check if new actions were added to the module
        const existingActionsSet = new Set(existingPermission.actions);
        const hasNewActions = allActions.some(
          (a) => !existingActionsSet.has(a),
        );

        if (hasNewActions) {
          await tx.rolePermission.update({
            where: { id: existingPermission.id },
            data: { actions: allActions },
          });
          permissionsUpdated++;
        }
      } else {
        // Create new permission for this module
        await tx.rolePermission.create({
          data: {
            roleId: role.id,
            moduleRefId: module.id,
            actions: allActions,
          },
        });
        permissionsCreated++;
      }
    }
  }

  return { permissionsCreated, permissionsUpdated };
}

/**
 * Upsert roles and permissions for a tenant (seed script use case).
 * Creates roles if they don't exist, updates permissions if they do.
 * This is more aggressive than syncRolesWithModules - it ensures all
 * configured permissions exist.
 *
 * @param tx - Prisma transaction client
 * @param tenantId - The tenant ID to upsert roles for
 * @param context - 'TENANT' for regular tenants, 'ADMIN' for administrator tenant
 * @returns The created/updated roles with their IDs
 */
export async function upsertDefaultRoles(
  tx: Prisma.TransactionClient,
  tenantId: string,
  context: RoleContext,
): Promise<Map<string, string>> {
  const roleConfigs = ROLE_PERMISSIONS[context];

  // Load all modules
  const modules = await tx.moduleRef.findMany({
    select: { id: true, name: true, actions: true },
  });
  const moduleMap = new Map(modules.map((m) => [m.name, m]));

  const roleMap = new Map<string, string>();

  for (const [roleName, modulePermissions] of Object.entries(roleConfigs)) {
    // Upsert the role
    const role = await tx.role.upsert({
      where: {
        name_tenantId: {
          name: roleName,
          tenantId,
        },
      },
      create: {
        name: roleName,
        description: `${roleName} role`,
        tenantId,
      },
      update: {
        description: `${roleName} role`,
      },
    });

    roleMap.set(roleName, role.id);

    // Upsert permissions for each module
    for (const [moduleName, permission] of Object.entries(
      modulePermissions as Record<string, 'ALL' | readonly string[]>,
    )) {
      const module = moduleMap.get(moduleName);

      if (!module) {
        throw new Error(
          `Module "${moduleName}" not found. Run seedModules first.`,
        );
      }

      const actions = resolveActions(moduleName, permission, module.actions);

      await tx.rolePermission.upsert({
        where: {
          roleId_moduleRefId: {
            roleId: role.id,
            moduleRefId: module.id,
          },
        },
        create: {
          roleId: role.id,
          moduleRefId: module.id,
          actions,
        },
        update: {
          actions,
        },
      });
    }
  }

  return roleMap;
}
