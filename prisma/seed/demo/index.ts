/**
 * Demo Seed Orchestrator
 *
 * Runs all demo seeders in the correct dependency order.
 * This is a SEPARATE entry point from the production seed.
 *
 * Usage: pnpm run seed:demo
 */

import 'dotenv/config';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { faker } from '@faker-js/faker';
import { DEMO_CONFIG } from './constants';

// Import demo seeders
import { seedDemoTenant } from './seedDemoTenant';
import { seedDemoUsers, seedDemoUserAssignments } from './seedDemoUsers';
import { seedDemoLocations } from './seedDemoLocations';
import { seedDemoSuppliers } from './seedDemoSuppliers';
import { seedDemoCategories } from './seedDemoCategories';
import { seedDemoProducts } from './seedDemoProducts';
import { seedDemoInventory } from './seedDemoInventory';
import { seedDemoCustomers } from './seedDemoCustomers';
import { seedDemoTransfers } from './seedDemoTransfers';

// Ensure modules are seeded first
import { seedModules } from '../seedModuleDefinition';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: DATABASE_URL,
  }),
  log: ['warn', 'error'],
});

async function main() {
  console.log('\n🚀 Starting demo seed...\n');
  console.log('━'.repeat(60));

  // Set faker seed for reproducible data
  faker.seed(DEMO_CONFIG.FAKER_SEED);

  const startTime = Date.now();

  try {
    // =========================================================================
    // 1. Ensure modules exist (required for permissions)
    // =========================================================================
    console.log('\n📦 Ensuring modules exist...');
    await seedModules(prisma);

    // =========================================================================
    // 2. Demo Tenant + Settings
    // =========================================================================
    console.log('\n🏢 Seeding demo tenant...');
    await seedDemoTenant(prisma);

    // =========================================================================
    // 3. Demo Users + Roles (must be before locations for createdByUserId FK)
    // =========================================================================
    console.log('\n� Seeding demo users...');
    await seedDemoUsers(prisma);

    // =========================================================================
    // 4. Demo Locations (after users for createdByUserId FK)
    // =========================================================================
    console.log('\n� Seeding demo locations...');
    await seedDemoLocations(prisma);

    // =========================================================================
    // 5. User Location Assignments (after locations exist)
    // =========================================================================
    console.log('\n🔗 Updating user location assignments...');
    await seedDemoUserAssignments(prisma);

    // =========================================================================
    // 6. Demo Suppliers
    // =========================================================================
    console.log('\n🚛 Seeding demo suppliers...');
    await seedDemoSuppliers(prisma);

    // =========================================================================
    // 6. Demo Categories
    // =========================================================================
    console.log('\n📁 Seeding demo categories...');
    await seedDemoCategories(prisma);

    // =========================================================================
    // 7. Demo Products
    // =========================================================================
    console.log('\n📦 Seeding demo products...');
    await seedDemoProducts(prisma);

    // =========================================================================
    // 8. Demo Inventory (Stock-in)
    // =========================================================================
    console.log('\n📊 Seeding demo inventory...');
    await seedDemoInventory(prisma);

    // =========================================================================
    // 9. Demo Customers
    // =========================================================================
    console.log('\n🧑‍💼 Seeding demo customers...');
    await seedDemoCustomers(prisma);

    // =========================================================================
    // 10. Demo Stock Transfers
    // =========================================================================
    console.log('\n🔄 Seeding demo transfers...');
    await seedDemoTransfers(prisma);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n' + '━'.repeat(60));
    console.log(`\n🎉 Demo seed completed successfully in ${duration}s!\n`);
  } catch (error) {
    console.error('\n❌ Demo seed failed:\n', error);
    throw error;
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`💥 Fatal error during demo seeding: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Prisma disconnected\n');
  });
