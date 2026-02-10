import {
  PrismaClient,
  CompanyType,
  Industry,
  TenantStatus,
  OnboardingStatus,
} from 'generated/prisma/client';
import { hashPassword } from './utils/helpers';
import { upsertDefaultRoles } from '@/modules/tenants/utils/role-initializer.utils';
import { SUPER_ADMIN_ROLE } from '@/common/constants/system-roles.constants';

const ADMIN_EMAIL = 'admin@pxlhut.com';
const ADMIN_TENANT_NAME = 'Pxlhut';

export async function seedAdministrator(prisma: PrismaClient) {
  console.log('🔄 Syncing administrator setup...');

  await prisma.$transaction(async (tx) => {
    // ---------------------------------------------------------------------
    // 1. Upsert administrator user
    // ---------------------------------------------------------------------
    const hashedPassword = await hashPassword('Admin@123');

    const adminUser = await tx.user.upsert({
      where: { email: ADMIN_EMAIL },
      create: {
        firstName: 'System',
        lastName: 'Administrator',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        businessType: [Industry.OTHER],
        emailVerified: new Date(),
        isActive: true,
        onboardingStatus: OnboardingStatus.COMPLETED,
        onboardingCompletedAt: new Date(),
      },
      update: {
        firstName: 'System',
        lastName: 'Administrator',
        isActive: true,
        onboardingStatus: OnboardingStatus.COMPLETED,
      },
    });

    console.log(`✅ Admin user synced: ${adminUser.email}`);

    // ---------------------------------------------------------------------
    // 2. Upsert administrator tenant
    // ---------------------------------------------------------------------
    const adminTenant = await tx.tenant.upsert({
      where: {
        name_isAdministrator: {
          name: ADMIN_TENANT_NAME,
          isAdministrator: true,
        },
      },
      create: {
        name: ADMIN_TENANT_NAME,
        companyType: CompanyType.PRIVATE_LIMITED,
        industry: Industry.TECHNOLOGY,
        registrationNumber: 'PXLHUT-ADMIN-001',
        businessEmail: 'info@pxlhut.com',
        businessPhone: '+1234567890',
        website: 'https://pxlhut.com',
        description: 'Pxlhut Administrator Tenant',
        establishedYear: new Date().getFullYear().toString(),
        status: TenantStatus.ACTIVE,
        isAdministrator: true,
        users: {
          connect: { id: adminUser.id },
        },
      },
      update: {
        companyType: CompanyType.PRIVATE_LIMITED,
        industry: Industry.TECHNOLOGY,
        businessEmail: 'info@pxlhut.com',
        businessPhone: '+1234567890',
        website: 'https://pxlhut.com',
        status: TenantStatus.ACTIVE,
      },
    });

    console.log(`✅ Admin tenant synced: ${adminTenant.name}`);

    // ---------------------------------------------------------------------
    // 3. Sync roles & permissions
    // ---------------------------------------------------------------------
    const roleMap = await upsertDefaultRoles(tx, adminTenant.id, 'ADMIN');

    // ---------------------------------------------------------------------
    // 4. Ensure SuperAdmin assignment
    // ---------------------------------------------------------------------
    const superAdminRoleId = roleMap.get(SUPER_ADMIN_ROLE);

    if (superAdminRoleId) {
      // Find existing assignment (handle null locationId manually)
      const existingAssignment = await tx.userAssignment.findFirst({
        where: {
          userId: adminUser.id,
          roleId: superAdminRoleId,
          tenantId: adminTenant.id,
          locationId: null,
        },
      });

      if (existingAssignment) {
        // Update if exists
        await tx.userAssignment.update({
          where: { id: existingAssignment.id },
          data: { accessScope: 'TENANT' },
        });
      } else {
        // Create if not exists
        await tx.userAssignment.create({
          data: {
            userId: adminUser.id,
            roleId: superAdminRoleId,
            tenantId: adminTenant.id,
            accessScope: 'TENANT',
            locationId: null,
          },
        });
      }
    }
  });

  console.log('🎉 Administrator seed synced successfully.');
}
