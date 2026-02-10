import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from 'generated/prisma/client';
import {
  initializeDefaultRoles,
  syncRolesWithModules,
  upsertDefaultRoles,
} from '../utils/role-initializer.utils';

type RoleContext = 'TENANT' | 'ADMIN';

/**
 * Service for managing tenant role initialization and synchronization.
 * Provides a clean API for initializing default roles when tenants are created
 * and syncing existing roles when new modules are added.
 */
@Injectable()
export class TenantRoleInitializerService {
  private readonly logger = new Logger(TenantRoleInitializerService.name);

  /**
   * Initialize default roles and permissions for a new tenant.
   * Should be called during tenant creation within a transaction.
   *
   * @param tx - Prisma transaction client
   * @param tenantId - The tenant ID to initialize roles for
   * @param context - 'TENANT' for regular tenants, 'ADMIN' for administrator tenant
   */
  async initializeTenantRoles(
    tx: Prisma.TransactionClient,
    tenantId: string,
    context: RoleContext = 'TENANT',
  ): Promise<void> {
    this.logger.log(`🔧 Initializing ${context} roles for tenant: ${tenantId}`);

    const result = await initializeDefaultRoles(tx, tenantId, context);

    this.logger.log(
      `✅ Created ${result.rolesCreated} roles and ${result.permissionsCreated} permissions`,
    );
  }

  /**
   * Sync existing roles with new modules (for 'ALL' permission roles only).
   * Used by seed scripts to update existing tenants when new modules are added.
   *
   * @param tx - Prisma transaction client
   * @param tenantId - The tenant ID to sync roles for
   * @param context - 'TENANT' for regular tenants, 'ADMIN' for administrator tenant
   */
  async syncRolesWithNewModules(
    tx: Prisma.TransactionClient,
    tenantId: string,
    context: RoleContext = 'TENANT',
  ): Promise<{ created: number; updated: number }> {
    this.logger.debug(`Syncing ${context} roles for tenant: ${tenantId}`);

    const result = await syncRolesWithModules(tx, tenantId, context);

    this.logger.debug(
      `Created ${result.permissionsCreated} permissions, updated ${result.permissionsUpdated} permissions`,
    );

    return {
      created: result.permissionsCreated,
      updated: result.permissionsUpdated,
    };
  }

  /**
   * Upsert default roles and permissions for a tenant.
   * Creates roles if they don't exist, updates permissions if they do.
   * Returns a map of role names to their IDs for further use (e.g., user assignment).
   *
   * @param tx - Prisma transaction client
   * @param tenantId - The tenant ID to upsert roles for
   * @param context - 'TENANT' for regular tenants, 'ADMIN' for administrator tenant
   * @returns Map of role name to role ID
   */
  async upsertTenantRoles(
    tx: Prisma.TransactionClient,
    tenantId: string,
    context: RoleContext = 'TENANT',
  ): Promise<Map<string, string>> {
    this.logger.debug(`Upserting ${context} roles for tenant: ${tenantId}`);

    return upsertDefaultRoles(tx, tenantId, context);
  }
}
