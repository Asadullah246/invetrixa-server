import 'dotenv/config';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedAdministrator } from './seedAdministrator';
import { seedModules } from './seedModuleDefinition';
import { syncTenantPermissions } from './syncTenantPermissions';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('❌ DATABASE_URL is not defined');
}

/**
 * Prevent accidental production seeding (optional but recommended)
 */
const NODE_ENV = process.env.NODE_ENV ?? 'development';
if (NODE_ENV === 'production') {
  console.warn(
    '⚠️  Running seed in PRODUCTION environment. Make sure this is intentional.',
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: DATABASE_URL,
  }),
  log: NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

async function main() {
  console.log('\n🚀 Starting database seeding...\n');

  try {
    // ---------------------------------------------------------------------
    // 1. Sync modules & actions (source of truth: MODULESREF)
    // ---------------------------------------------------------------------
    await seedModules(prisma);

    // ---------------------------------------------------------------------
    // 2. Sync administrator tenant, user, roles & permissions
    // ---------------------------------------------------------------------
    await seedAdministrator(prisma);

    // ---------------------------------------------------------------------
    // 3. Sync existing tenant roles with "ALL" permissions to new modules
    //    - Only roles with 'ALL' config get new module access
    //    - Roles with specific actions are unchanged
    //    - Custom roles are untouched (superadmin assigns manually)
    // ---------------------------------------------------------------------
    await syncTenantPermissions(prisma);

    console.log('\n✅ Database seeding completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Seeding failed:\n', error);
    throw error;
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`💥 Fatal error during seeding: ${message}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🔌 Prisma disconnected\n');
  });
