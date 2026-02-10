/**
 * Seed Demo Customers
 *
 * Creates individual and business customers with addresses.
 */

import {
  PrismaClient,
  CustomerType,
  CustomerStatus,
  AddressType,
} from 'generated/prisma/client';
import { faker } from '@faker-js/faker';
import { DEMO_TENANT_ID, DEMO_USER_IDS, DEMO_CONFIG } from './constants';

export async function seedDemoCustomers(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(async (tx) => {
    let individualCount = 0;
    let businessCount = 0;

    // =========================================================================
    // 1. Create Individual Customers
    // =========================================================================
    for (let i = 1; i <= DEMO_CONFIG.INDIVIDUAL_CUSTOMER_COUNT; i++) {
      const customerId = `demo-customer-ind-${String(i).padStart(3, '0')}`;
      const phone = `+88017${faker.string.numeric(8)}`;
      const email = faker.internet.email().toLowerCase();

      const customer = await tx.customer.upsert({
        where: { id: customerId },
        create: {
          id: customerId,
          customerType: CustomerType.INDIVIDUAL,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email,
          phone,
          alternatePhone:
            i % 3 === 0 ? `+88018${faker.string.numeric(8)}` : null,
          status: CustomerStatus.ACTIVE,
          tags: i <= 3 ? ['VIP'] : ['Regular'],
          notes: i <= 3 ? 'Premium customer - priority support' : null,
          tenantId: DEMO_TENANT_ID,
          createdById: DEMO_USER_IDS.OWNER,
        },
        update: {
          status: CustomerStatus.ACTIVE,
        },
      });

      // Create 1-2 addresses for each customer
      const addressCount = faker.number.int({ min: 1, max: 2 });

      for (let j = 1; j <= addressCount; j++) {
        const addressId = `${customerId}-addr-${j}`;
        const isDefault = j === 1;

        await tx.customerAddress.upsert({
          where: { id: addressId },
          create: {
            id: addressId,
            customerId: customer.id,
            addressType: j === 1 ? AddressType.BOTH : AddressType.SHIPPING,
            label: j === 1 ? 'Home' : 'Office',
            isDefault,
            addressLine1: faker.location.streetAddress(),
            addressLine2: faker.location.secondaryAddress(),
            city: faker.helpers.arrayElement([
              'Dhaka',
              'Chittagong',
              'Sylhet',
              'Rajshahi',
            ]),
            state: 'Bangladesh',
            postalCode: faker.location.zipCode('####'),
            country: 'Bangladesh',
          },
          update: {
            isDefault,
          },
        });
      }

      individualCount++;
    }

    // =========================================================================
    // 2. Create Business Customers
    // =========================================================================
    for (let i = 1; i <= DEMO_CONFIG.BUSINESS_CUSTOMER_COUNT; i++) {
      const customerId = `demo-customer-biz-${String(i).padStart(3, '0')}`;
      const phone = `+88019${faker.string.numeric(8)}`;

      const customer = await tx.customer.upsert({
        where: { id: customerId },
        create: {
          id: customerId,
          customerType: CustomerType.BUSINESS,
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          companyName: faker.company.name(),
          taxId: `TIN-${faker.string.numeric(12)}`,
          email: faker.internet
            .email({ provider: 'company.com' })
            .toLowerCase(),
          phone,
          status: CustomerStatus.ACTIVE,
          tags: ['B2B', 'Wholesale'],
          notes: 'Business customer - bulk pricing applicable',
          tenantId: DEMO_TENANT_ID,
          createdById: DEMO_USER_IDS.OWNER,
        },
        update: {
          status: CustomerStatus.ACTIVE,
        },
      });

      // Create billing and shipping addresses
      const billingId = `${customerId}-billing`;
      const shippingId = `${customerId}-shipping`;

      await tx.customerAddress.upsert({
        where: { id: billingId },
        create: {
          id: billingId,
          customerId: customer.id,
          addressType: AddressType.BILLING,
          label: 'Head Office',
          isDefault: true,
          addressLine1: faker.location.streetAddress(),
          city: 'Dhaka',
          state: 'Dhaka Division',
          postalCode: faker.location.zipCode('####'),
          country: 'Bangladesh',
        },
        update: {},
      });

      await tx.customerAddress.upsert({
        where: { id: shippingId },
        create: {
          id: shippingId,
          customerId: customer.id,
          addressType: AddressType.SHIPPING,
          label: 'Warehouse',
          isDefault: false,
          addressLine1: faker.location.streetAddress(),
          city: faker.helpers.arrayElement(['Savar', 'Gazipur', 'Narayanganj']),
          state: 'Dhaka Division',
          postalCode: faker.location.zipCode('####'),
          country: 'Bangladesh',
        },
        update: {},
      });

      businessCount++;
    }

    const totalCustomers = individualCount + businessCount;
    console.log(`   ✅ ${totalCustomers} customers created`);
    console.log(`      - ${individualCount} individual (B2C)`);
    console.log(`      - ${businessCount} business (B2B)`);
  });
}
