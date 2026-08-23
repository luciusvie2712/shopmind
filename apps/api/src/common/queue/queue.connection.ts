import { type ConnectionOptions } from 'bullmq';
import { config } from '../config';

export function queueConnectionOptions(): ConnectionOptions {
  const url = new URL(config.redisUrl);
  const database = url.pathname.slice(1);

  return {
    host: url.hostname,
    port: url.port === '' ? 6379 : Number(url.port),
    ...(url.username === ''
      ? {}
      : { username: decodeURIComponent(url.username) }),
    ...(url.password === ''
      ? {}
      : { password: decodeURIComponent(url.password) }),
    ...(database === '' ? {} : { db: Number(database) }),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
