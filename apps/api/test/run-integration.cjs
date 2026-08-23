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
    'test/jest-integration.json',
    '--runInBand',
    ...process.argv.slice(2),
  ]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
