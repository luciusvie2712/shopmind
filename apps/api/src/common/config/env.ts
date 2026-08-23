import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseEnvironment } from './env.schema';

function findWorkspaceRoot(startPath: string): string | undefined {
  let currentPath = resolve(startPath);

  while (true) {
    if (existsSync(resolve(currentPath, 'pnpm-workspace.yaml'))) {
      return currentPath;
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      return undefined;
    }
    currentPath = parentPath;
  }
}

const workspaceRoot =
  findWorkspaceRoot(process.cwd()) ?? findWorkspaceRoot(__dirname);
const rootEnvironmentPath =
  workspaceRoot === undefined ? undefined : resolve(workspaceRoot, '.env');

if (rootEnvironmentPath !== undefined && existsSync(rootEnvironmentPath)) {
  process.loadEnvFile(rootEnvironmentPath);
}

export const config = parseEnvironment(process.env);
