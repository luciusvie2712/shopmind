import { Injectable, type OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { config } from '../config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client = new Redis(config.redisUrl, {
    connectTimeout: 3_000,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  async ping(): Promise<void> {
    const response = await this.client.ping();
    if (response !== 'PONG') {
      throw new Error('Redis readiness check failed');
    }
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async setWithTtl(
    key: string,
    value: string,
    ttlSeconds: number,
  ): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }

  async deleteKeys(keys: readonly string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.client.del(...keys);
  }

  scan(
    cursor: string,
    pattern: string,
    count: number,
  ): Promise<[cursor: string, keys: string[]]> {
    return this.client.scan(cursor, 'MATCH', pattern, 'COUNT', count);
  }

  ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incrementFixedWindow(
    key: string,
    ttlSeconds: number,
  ): Promise<{ readonly count: number; readonly ttlSeconds: number }> {
    const result: unknown = await this.client.eval(
      `
        local count = redis.call('INCR', KEYS[1])
        if count == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        local ttl = redis.call('TTL', KEYS[1])
        if ttl < 0 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
          ttl = tonumber(ARGV[1])
        end
        return { count, ttl }
      `,
      1,
      key,
      ttlSeconds,
    );
    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      typeof result[0] !== 'number' ||
      typeof result[1] !== 'number'
    ) {
      throw new Error('Redis returned an invalid rate-limit result');
    }
    return { count: result[0], ttlSeconds: result[1] };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.status === 'wait' || this.client.status === 'end') {
      return;
    }

    await this.client.quit();
  }
}
