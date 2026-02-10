/**
 * Seed Demo Tenant
 *
 * Creates the demo tenant with settings and unit types.
 */

import {
  PrismaClient,
  CompanyType,
  Industry,
  TenantStatus,
  PricingMethod,
} from 'generated/prisma/client';
import { DEMO_TENANT_ID, DEMO_TENANT_NAME, DEMO_UNIT_TYPES } from './constants';

export async function seedDemoTenant(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // =========================================================================
    // 1. Upsert Demo Tenant
    // =========================================================================
    const tenant = await tx.tenant.upsert({
      where: { id: DEMO_TENANT_ID },
      create: {
        id: DEMO_TENANT_ID,
        name: DEMO_TENANT_NAME,
        companyType: CompanyType.PRIVATE_LIMITED,
        industry: Industry.RETAIL,
        registrationNumber: 'DEMO-REG-001',
        businessEmail: 'demo@invetrixa.com',
        businessPhone: '+8801700000001',
        website: 'https://demo.invetrixa.com',
        description:
          'Demo tenant for testing and demonstration purposes. This tenant showcases all features of the Invetrixa platform.',
        establishedYear: '2024',
        status: TenantStatus.ACTIVE,
        defaultPricingMethod: PricingMethod.FIFO,
        isAdministrator: false,
      },
      update: {
        name: DEMO_TENANT_NAME,
        status: TenantStatus.ACTIVE,
        defaultPricingMethod: PricingMethod.FIFO,
      },
    });

    // =========================================================================
    // 2. Upsert Tenant Settings
    // =========================================================================
    await tx.tenantSettings.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        defaultPricingMethod: PricingMethod.FIFO,
        timezone: 'Asia/Dhaka',
        locale: 'en-BD',
        currency: 'BDT',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: 'hh:mm A',
        decimalSeparator: '.',
        thousandsSeparator: ',',
      },
      update: {
        timezone: 'Asia/Dhaka',
        locale: 'en-BD',
        currency: 'BDT',
      },
    });

    // =========================================================================
    // 3. Upsert Tenant Unit Types
    // =========================================================================
    await tx.tenantUnitTypes.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        values: [...DEMO_UNIT_TYPES],
      },
      update: {
        values: [...DEMO_UNIT_TYPES],
      },
    });

    // =========================================================================
    // 4. Upsert Tenant Address
    // =========================================================================
    await tx.address.upsert({
      where: { tenantId: tenant.id },
      create: {
        tenantId: tenant.id,
        addressLine1: '123 Demo Street',
        addressLine2: 'Gulshan-2',
        city: 'Dhaka',
        state: 'Dhaka Division',
        postalCode: '1212',
        country: 'Bangladesh',
        latitude: 23.7925,
        longitude: 90.4078,
      },
      update: {
        city: 'Dhaka',
        country: 'Bangladesh',
      },
    });

    console.log(`   ✅ Demo tenant created: ${tenant.name}`);
    console.log(`   ✅ Tenant settings configured (BDT, Asia/Dhaka)`);
    console.log(
      `   ✅ Unit types configured (${DEMO_UNIT_TYPES.length} types)`,
    );
  });
}
