const {
  ensureTestDatabase,
  migrateTestDatabase,
  runNodeModule,
} = require('./test-environment.cjs');

async function main() {
  await ensureTestDatabase();
  migrateTestDatabase();
  runNodeModule(require.resolve('jest/bin/jest'), [
    '--config',
    'performance/jest-performance.json',
    '--runInBand',
  ]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
