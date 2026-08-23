import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnvironment } from './env.schema';

const rootEnvironmentPath = resolve(__dirname, '../../../../../.env');

if (existsSync(rootEnvironmentPath)) {
  process.loadEnvFile(rootEnvironmentPath);
}

export const config = parseEnvironment(process.env);
