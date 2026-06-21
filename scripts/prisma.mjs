import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaScript = join(__dirname, 'prisma-schema.mjs');

const schemaResult = spawnSync(process.execPath, [schemaScript], {
  stdio: 'inherit',
  env: process.env
});

if (schemaResult.status !== 0) {
  process.exit(schemaResult.status ?? 1);
}

const args = process.argv.slice(2);
const result = spawnSync('npx', ['prisma', ...args], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK:
      process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK ?? '1'
  }
});

process.exit(result.status ?? 1);
