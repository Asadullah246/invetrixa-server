import { config } from 'dotenv';
import { join } from 'node:path';
import { defineConfig } from 'prisma/config';

// Check if DATABASE_URL is already set (e.g., from Docker environment)
let databaseUrl = process.env.DATABASE_URL;

// If not set, try loading from .env files (for local development)
if (!databaseUrl) {
  config({ path: '.env.development' });
  config({ path: '.env' });
  databaseUrl = process.env.DATABASE_URL;
}

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Please set it in your environment or .env.development file.',
  );
}

export default defineConfig({
  schema: join('prisma', 'schemas'),
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed/index.ts',
  },
  datasource: {
    url: databaseUrl,
  },
});
