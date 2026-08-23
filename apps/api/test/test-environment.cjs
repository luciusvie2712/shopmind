const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');

const defaultDatabaseUrl =
  'postgresql://shopmind:shopmind_local@localhost:5432/shopmind';
const sourceDatabaseUrl = new URL(
  process.env.DATABASE_URL || defaultDatabaseUrl,
);

if (
  !['localhost', '127.0.0.1'].includes(sourceDatabaseUrl.hostname) &&
  process.env.SHOPMIND_ALLOW_REMOTE_TEST_DATABASE !== 'true'
) {
  throw new Error(
    'Tests require a local database unless SHOPMIND_ALLOW_REMOTE_TEST_DATABASE=true is explicitly set.',
  );
}

const sourceDatabaseName = sourceDatabaseUrl.pathname.slice(1) || 'shopmind';
const testDatabaseName = sourceDatabaseName.endsWith('_test')
  ? sourceDatabaseName
  : `${sourceDatabaseName}_test`;

if (!/^[a-zA-Z0-9_]+$/.test(testDatabaseName)) {
  throw new Error('Derived test database name contains unsafe characters.');
}

const testDatabaseUrl = new URL(sourceDatabaseUrl);
testDatabaseUrl.pathname = `/${testDatabaseName}`;
const adminDatabaseUrl = new URL(sourceDatabaseUrl);
adminDatabaseUrl.pathname = '/postgres';

const testEnvironment = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: testDatabaseUrl.toString(),
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6380/15',
  JWT_ACCESS_SECRET:
    process.env.JWT_ACCESS_SECRET || 'phase11-local-test-access-secret',
  JWT_ACCESS_TTL: process.env.JWT_ACCESS_TTL || '15m',
  REFRESH_TOKEN_TTL_DAYS: process.env.REFRESH_TOKEN_TTL_DAYS || '7',
  COOKIE_SECURE: 'false',
  DUMMYJSON_BASE_URL:
    process.env.DUMMYJSON_BASE_URL || 'https://dummyjson.invalid',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'phase11-not-used',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'phase11-mocked-model',
  GEMINI_EMBEDDING_MODEL:
    process.env.GEMINI_EMBEDDING_MODEL || 'phase11-mocked-embedding',
  GEMINI_EMBEDDING_DIMENSION: '768',
  AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS || '8000',
  AI_MAX_TOOL_STEPS: process.env.AI_MAX_TOOL_STEPS || '4',
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://127.0.0.1:3011',
};

function runNodeModule(modulePath, args, options = {}) {
  const result = spawnSync(process.execPath, [modulePath, ...args], {
    cwd: options.cwd || process.cwd(),
    env: { ...testEnvironment, ...options.env },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}

async function ensureTestDatabase() {
  const admin = new PrismaClient({
    datasources: { db: { url: adminDatabaseUrl.toString() } },
  });
  try {
    const existing = await admin.$queryRawUnsafe(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      testDatabaseName,
    );
    if (existing.length === 0) {
      await admin.$executeRawUnsafe(`CREATE DATABASE "${testDatabaseName}"`);
    }
  } finally {
    await admin.$disconnect();
  }
}

function migrateTestDatabase(cwd = process.cwd()) {
  runNodeModule(
    require.resolve('prisma/build/index.js'),
    ['migrate', 'deploy', '--schema', '../../prisma/schema.prisma'],
    { cwd },
  );
}

module.exports = {
  ensureTestDatabase,
  migrateTestDatabase,
  runNodeModule,
  testDatabaseUrl: testDatabaseUrl.toString(),
  testEnvironment,
};
