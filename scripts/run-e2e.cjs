const { spawnSync } = require('node:child_process');

const corepack = process.platform === 'win32' ? 'corepack.cmd' : 'corepack';

for (const packageName of ['api', 'web']) {
  const result = spawnSync(corepack, ['pnpm', '--filter', packageName, 'test:e2e'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
