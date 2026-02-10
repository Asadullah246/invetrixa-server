/**
 * Safe Docker Database Reset Script
 *
 * This script adds a confirmation prompt before resetting the database
 * inside the Docker container.
 *
 * Usage: pnpm run docker:reset
 */

import {
  confirmDanger,
  blockInProduction,
  colors,
} from '../src/common/cli/confirm';
import { execSync } from 'child_process';

const { bold, dim, crimson, mintGreen, gold, aurora, coral } = colors;

async function main() {
  // 🛑 Block in production
  blockInProduction('reset Docker database');

  console.log('');
  console.log(bold(aurora('🐳 Docker Database Reset Script')));
  console.log(dim('================================'));
  console.log(gold('Dont hurry up! This will:'));
  console.log(dim('  • Drop all tables in the Docker database'));
  console.log(dim('  • Re-apply all migrations'));
  console.log(dim('  • Run seed scripts'));
  console.log('');

  const confirmed = await confirmDanger(
    'this will DELETE the entire Docker database and reset it. Continue?',
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
  console.log(coral('🔥 Resetting Docker database...'));
  console.log('');

  try {
    execSync(
      'docker compose -f docker-compose.dev.yml exec app pnpm exec prisma migrate reset --force',
      {
        stdio: 'inherit',
      },
    );
    console.log('');
    console.log(mintGreen('✅ Docker database reset complete!'));
    console.log('');
  } catch {
    console.log('');
    console.error(crimson('❌ Docker database reset failed!'));
    console.log('');
    process.exit(1);
  }
}

void main();
