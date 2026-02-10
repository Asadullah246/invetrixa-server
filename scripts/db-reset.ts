/**
 * Safe Database Reset Script
 *
 * This script adds a confirmation prompt before resetting the database.
 * Default is NO (safe by default) - just pressing Enter will cancel.
 *
 * Usage: pnpm run db:reset
 */

import {
  confirmDanger,
  blockInProduction,
  colors,
} from '../src/common/cli/confirm';
import { execSync } from 'child_process';

const { bold, dim, crimson, mintGreen, gold, ocean, coral } = colors;

async function main() {
  // 🛑 Block in production
  blockInProduction('reset database');

  console.log('');
  console.log(bold(ocean('🗄️  Database Reset Script')));
  console.log(dim('========================'));
  console.log(gold('Dont hurry up! This will:'));
  console.log(dim('  • Drop all tables'));
  console.log(dim('  • Re-apply all migrations'));
  console.log(dim('  • Run seed scripts'));
  console.log('');

  const confirmed = await confirmDanger(
    'this will DELETE the entire database and reset it. Continue?',
    {
      defaultNo: true,
      showEnvironment: true,
      showUsername: true,
    },
  );

  if (!confirmed) {
    console.log('');
    console.log(crimson('❌ Cancelled. No changes were made.'));
    console.log('');
    process.exit(0);
  }

  console.log('');
  console.log(coral('🔥 Resetting database...'));
  console.log('');

  try {
    execSync('pnpm exec prisma migrate reset --force', {
      stdio: 'inherit',
    });
    console.log('');
    console.log(mintGreen('✅ Database reset complete!'));
    console.log('');
  } catch {
    console.log('');
    console.error(crimson('❌ Database reset failed!'));
    console.log('');
    process.exit(1);
  }
}

void main();
