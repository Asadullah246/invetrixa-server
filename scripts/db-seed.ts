/**
 * Safe Database Seed Script
 *
 * This script adds a confirmation prompt before seeding the database.
 *
 * Usage: pnpm run db:seed
 */

import {
  confirmDanger,
  blockInProduction,
  colors,
} from '../src/common/cli/confirm';
import { execSync } from 'child_process';

const { bold, dim, crimson, mintGreen, gold, forest, lime } = colors;

async function main() {
  // 🛑 Block in production
  blockInProduction('seed database');

  console.log('');
  console.log(bold(forest('🌱 Database Seed Script')));
  console.log(dim('======================='));
  console.log(gold('This will run the Prisma seed scripts.'));
  console.log('');

  const confirmed = await confirmDanger(
    'this will seed the database with initial data. Continue?',
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
  console.log(lime('🌱 Seeding database...'));
  console.log('');

  try {
    execSync('pnpm exec prisma db seed', {
      stdio: 'inherit',
    });
    console.log('');
    console.log(mintGreen('✅ Database seeding complete!'));
    console.log('');
  } catch {
    console.log('');
    console.error(crimson('❌ Database seeding failed!'));
    console.log('');
    process.exit(1);
  }
}

void main();
