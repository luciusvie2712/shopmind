const {
  ensureTestDatabase,
  migrateTestDatabase,
  testEnvironment,
} = require('./test-environment.cjs');
const { prepare } = require('./phase11-e2e-data.cjs');
const path = require('node:path');

async function main() {
  const apiRoot = path.resolve(__dirname, '..');
  await ensureTestDatabase();
  migrateTestDatabase(apiRoot);
  await prepare();
  Object.assign(process.env, testEnvironment, {
    API_PORT: '4011',
    WEB_ORIGIN: 'http://localhost:3011',
  });
  require('../dist/main.js');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
