/**
 * Seed Demo Users
 *
 * Separated into two phases to handle FK constraints:
 * Phase 1 (seedDemoUsers): Creates roles and users with tenant-level assignments
 * Phase 2 (seedDemoUserAssignments): Creates location-specific assignments (after locations exist)
 */

import {
  PrismaClient,
  OnboardingStatus,
  AccessScope,
} from 'generated/prisma/client';
import { faker } from '@faker-js/faker';
import { hashPassword } from '../utils/helpers';
import { ROLE_PERMISSIONS } from '@/modules/modules-definition/data/moduleAndDefaultPermittions.data';
import {
  DEMO_TENANT_ID,
  DEMO_USER_IDS,
  DEMO_USER_PASSWORD,
  DEMO_ROLE_IDS,
  DEMO_LOCATION_IDS,
} from './constants';

interface DemoUserData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleId: string;
  roleName: 'SuperAdmin' | 'Admin' | 'Editor';
  accessScope: AccessScope;
  locationId: string | null;
}

/**
 * Phase 1: Create roles and users (no location-specific assignments yet)
 */
export async function seedDemoUsers(prisma: PrismaClient): Promise<void> {
  const hashedPassword = await hashPassword(DEMO_USER_PASSWORD);

  await prisma.$transaction(async (tx) => {
    // =========================================================================
    // 1. Create Roles
    // =========================================================================
    const roleConfigs = ROLE_PERMISSIONS.TENANT;

    const modules = await tx.moduleRef.findMany({
      select: { id: true, name: true, actions: true },
    });
    const moduleMap = new Map(modules.map((m) => [m.name, m]));

    const rolesToCreate: Array<{
      id: string;
      name: string;
      permissions: Record<string, 'ALL' | readonly string[]>;
    }> = [
      {
        id: DEMO_ROLE_IDS.SUPER_ADMIN,
        name: 'SuperAdmin',
        permissions: roleConfigs.SuperAdmin,
      },
      {
        id: DEMO_ROLE_IDS.ADMIN,
        name: 'Admin',
        permissions: roleConfigs.Admin,
      },
      {
        id: DEMO_ROLE_IDS.EDITOR,
        name: 'Editor',
        permissions: roleConfigs.Editor,
      },
    ];

    for (const roleData of rolesToCreate) {
      const role = await tx.role.upsert({
        where: {
          name_tenantId: {
            name: roleData.name,
            tenantId: DEMO_TENANT_ID,
          },
        },
        create: {
          id: roleData.id,
          name: roleData.name,
          description: `Demo ${roleData.name} role`,
          tenantId: DEMO_TENANT_ID,
        },
        update: {
          description: `Demo ${roleData.name} role`,
        },
      });

      for (const [moduleName, permission] of Object.entries(
        roleData.permissions,
      )) {
        const module = moduleMap.get(moduleName);
        if (!module) continue;

        const actions = permission === 'ALL' ? module.actions : [...permission];

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

    console.log(`   ✅ 3 roles created with permissions`);

    // =========================================================================
    // 2. Create Demo Users (with TENANT-wide assignments only)
    // =========================================================================
    const demoUsers: DemoUserData[] = [
      {
        id: DEMO_USER_IDS.OWNER,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: 'owner@demo.pxlhut.com',
        roleId: DEMO_ROLE_IDS.SUPER_ADMIN,
        roleName: 'SuperAdmin',
        accessScope: AccessScope.TENANT,
        locationId: null,
      },
      {
        id: DEMO_USER_IDS.MANAGER_1,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: 'manager1@demo.pxlhut.com',
        roleId: DEMO_ROLE_IDS.ADMIN,
        roleName: 'Admin',
        accessScope: AccessScope.TENANT,
        locationId: null,
      },
      {
        id: DEMO_USER_IDS.MANAGER_2,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: 'manager2@demo.pxlhut.com',
        roleId: DEMO_ROLE_IDS.ADMIN,
        roleName: 'Admin',
        accessScope: AccessScope.TENANT, // Will be overridden in phase 2
        locationId: null,
      },
      {
        id: DEMO_USER_IDS.STAFF_1,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: 'staff1@demo.pxlhut.com',
        roleId: DEMO_ROLE_IDS.EDITOR,
        roleName: 'Editor',
        accessScope: AccessScope.TENANT, // Will be overridden in phase 2
        locationId: null,
      },
      {
        id: DEMO_USER_IDS.STAFF_2,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        email: 'staff2@demo.pxlhut.com',
        roleId: DEMO_ROLE_IDS.EDITOR,
        roleName: 'Editor',
        accessScope: AccessScope.TENANT, // Will be overridden in phase 2
        locationId: null,
      },
    ];

    for (const userData of demoUsers) {
      const user = await tx.user.upsert({
        where: { email: userData.email },
        create: {
          id: userData.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          password: hashedPassword,
          businessType: ['RETAIL'],
          emailVerified: new Date(),
          isActive: true,
          onboardingStatus: OnboardingStatus.COMPLETED,
          onboardingCompletedAt: new Date(),
          tenants: {
            connect: { id: DEMO_TENANT_ID },
          },
        },
        update: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          isActive: true,
        },
      });

      // Only create TENANT-wide assignments (no locationId)
      // Location-specific assignments are created in phase 2
      const existingAssignment = await tx.userAssignment.findFirst({
        where: {
          userId: user.id,
          roleId: userData.roleId,
          tenantId: DEMO_TENANT_ID,
        },
      });

      if (!existingAssignment) {
        await tx.userAssignment.create({
          data: {
            userId: user.id,
            roleId: userData.roleId,
            tenantId: DEMO_TENANT_ID,
            accessScope: userData.accessScope,
            locationId: null, // Always null in phase 1
          },
        });
      }
    }

    console.log(`   ✅ 5 users created`);
  });
}

/**
 * Phase 2: Update assignments with location-specific access
 * Called AFTER locations are seeded
 */
export async function seedDemoUserAssignments(
  prisma: PrismaClient,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Define location-specific assignments
    const locationAssignments = [
      {
        userId: DEMO_USER_IDS.MANAGER_2,
        roleId: DEMO_ROLE_IDS.ADMIN,
        locationId: DEMO_LOCATION_IDS.MAIN_WAREHOUSE,
        accessScope: AccessScope.LOCATION,
      },
      {
        userId: DEMO_USER_IDS.STAFF_1,
        roleId: DEMO_ROLE_IDS.EDITOR,
        locationId: DEMO_LOCATION_IDS.STORE_DHAKA,
        accessScope: AccessScope.LOCATION,
      },
      {
        userId: DEMO_USER_IDS.STAFF_2,
        roleId: DEMO_ROLE_IDS.EDITOR,
        locationId: DEMO_LOCATION_IDS.STORE_CHITTAGONG,
        accessScope: AccessScope.LOCATION,
      },
    ];

    for (const assignment of locationAssignments) {
      // Update existing assignment to add location-specific access
      await tx.userAssignment.updateMany({
        where: {
          userId: assignment.userId,
          roleId: assignment.roleId,
          tenantId: DEMO_TENANT_ID,
        },
        data: {
          accessScope: assignment.accessScope,
          locationId: assignment.locationId,
        },
      });
    }

    console.log(`   ✅ 3 location-specific assignments updated`);
    console.log(`      - Manager 2 → Main Warehouse`);
    console.log(`      - Staff 1 → Store Dhaka`);
    console.log(`      - Staff 2 → Store Chittagong`);
  });
}
