import { PrismaClient } from 'generated/prisma/client';
import { syncRolesWithModules } from '@/modules/tenants/utils/role-initializer.utils';

/**
 * Syncs tenant role permissions for roles that have "ALL" access configured.
 *
 * When a new module is added to MODULESREF:
 * - Roles with 'ALL' permission → get full access to new module actions
 * - Roles with specific actions → keep existing permissions (no new module)
 * - Custom roles → untouched (superadmin assigns manually)
 *
 * This script should be run after seedModules() to sync existing tenants.
 */
export async function syncTenantPermissions(prisma: PrismaClient) {
  console.log('🔄 Syncing tenant role permissions for "ALL" access roles...');

  const stats = {
    tenantsProcessed: 0,
    rolesUpdated: 0,
    permissionsCreated: 0,
    permissionsUpdated: 0,
  };

  await prisma.$transaction(async (tx) => {
    // -------------------------------------------------------------------------
    // 1. Get all non-administrator tenants
    // -------------------------------------------------------------------------
    const tenants = await tx.tenant.findMany({
      where: {
        isAdministrator: false,
        deletedAt: null,
      },
      select: { id: true, name: true },
    });

    console.log(`📦 Found ${tenants.length} tenant(s) to process`);

    // -------------------------------------------------------------------------
    // 2. Sync each tenant's roles with new modules
    // -------------------------------------------------------------------------
    for (const tenant of tenants) {
      stats.tenantsProcessed++;

      const result = await syncRolesWithModules(tx, tenant.id, 'TENANT');
      stats.permissionsCreated += result.permissionsCreated;
      stats.permissionsUpdated += result.permissionsUpdated;

      if (result.permissionsCreated > 0 || result.permissionsUpdated > 0) {
        stats.rolesUpdated++;
      }
    }

    // -------------------------------------------------------------------------
    // 3. Also sync administrator tenant roles
    // -------------------------------------------------------------------------
    const adminTenant = await tx.tenant.findFirst({
      where: { isAdministrator: true },
      select: { id: true, name: true },
    });

    if (adminTenant) {
      console.log(`🔐 Syncing administrator tenant: ${adminTenant.name}`);

      const result = await syncRolesWithModules(tx, adminTenant.id, 'ADMIN');
      stats.permissionsCreated += result.permissionsCreated;
      stats.permissionsUpdated += result.permissionsUpdated;

      if (result.permissionsCreated > 0 || result.permissionsUpdated > 0) {
        stats.rolesUpdated++;
      }
    }
  });

  console.log('✨ Tenant permission sync complete:');
  console.log(`   📦 Tenants processed: ${stats.tenantsProcessed}`);
  console.log(`   🎭 Roles updated: ${stats.rolesUpdated}`);
  console.log(`   ➕ Permissions created: ${stats.permissionsCreated}`);
  console.log(`   🔄 Permissions updated: ${stats.permissionsUpdated}`);
}
