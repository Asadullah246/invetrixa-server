/**
 * Seed Demo Suppliers
 *
 * Creates supplier records with Faker-generated data.
 */

import { PrismaClient } from 'generated/prisma/client';
import { faker } from '@faker-js/faker';
import { DEMO_TENANT_ID, DEMO_SUPPLIER_IDS, DEMO_CONFIG } from './constants';

export async function seedDemoSuppliers(prisma: PrismaClient): Promise<void> {
  const supplierIds = Object.values(DEMO_SUPPLIER_IDS);

  const suppliers = supplierIds.map((id, index) => ({
    id,
    name: faker.company.name(),
    email: faker.internet.email().toLowerCase(),
    phone: `+88017${faker.string.numeric(8)}`,
    contactName: faker.person.fullName(),
    address: `${faker.location.streetAddress()}, ${faker.location.city()}, Bangladesh`,
    notes: index < 3 ? 'Premium supplier - priority handling' : null,
  }));

  await prisma.$transaction(async (tx) => {
    for (const supplier of suppliers) {
      await tx.supplier.upsert({
        where: {
          id: supplier.id,
        },
        create: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          contactName: supplier.contactName,
          address: supplier.address,
          notes: supplier.notes,
          tenantId: DEMO_TENANT_ID,
        },
        update: {
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          contactName: supplier.contactName,
        },
      });
    }

    console.log(`   ✅ ${DEMO_CONFIG.SUPPLIER_COUNT} suppliers created`);
  });
}
