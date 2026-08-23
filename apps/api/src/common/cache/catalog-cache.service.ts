import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { type ZodType } from 'zod';
import { RedisService } from '../redis/redis.service';

export const CATALOG_CACHE_KEYS = {
  categories: 'categories:v1',
  product: (id: string) => `product:${id}`,
  productListPrefix: 'products:list:',
} as const;

export const CATALOG_CACHE_TTL_SECONDS = {
  categories: 60 * 60,
  product: 10 * 60,
  productList: 3 * 60,
} as const;

export function buildProductListCacheKey(
  query: Readonly<Record<string, string | number | undefined>>,
): string {
  const canonicalQuery = Object.fromEntries(
    Object.entries(query)
      .filter((entry): entry is [string, string | number] =>
        ['string', 'number'].includes(typeof entry[1]),
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const hash = createHash('sha256')
    .update(JSON.stringify(canonicalQuery))
    .digest('hex');

  return `${CATALOG_CACHE_KEYS.productListPrefix}${hash}`;
}

@Injectable()
export class CatalogCacheService {
  private readonly logger = new Logger(CatalogCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string, schema: ZodType<T>): Promise<T | null> {
    try {
      const serialized = await this.redis.get(key);
      if (serialized === null) {
        return null;
      }

      const parsedJson: unknown = JSON.parse(serialized);
      const parsed = schema.safeParse(parsedJson);
      if (!parsed.success) {
        await this.redis.deleteKeys([key]);
        this.logFailure('read_invalid', key, parsed.error);
        return null;
      }

      return parsed.data;
    } catch (error) {
      this.logFailure('read', key, error);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.setWithTtl(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logFailure('write', key, error);
    }
  }

  async invalidateCatalog(productIds: readonly string[]): Promise<void> {
    try {
      const productKeys = productIds.map(CATALOG_CACHE_KEYS.product);
      await this.redis.deleteKeys([
        CATALOG_CACHE_KEYS.categories,
        ...productKeys,
      ]);

      let cursor = '0';
      do {
        const result = await this.redis.scan(
          cursor,
          `${CATALOG_CACHE_KEYS.productListPrefix}*`,
          100,
        );
        cursor = result[0];
        await this.redis.deleteKeys(result[1]);
      } while (cursor !== '0');
    } catch (error) {
      this.logFailure('invalidate', 'catalog', error);
    }
  }

  private logFailure(operation: string, key: string, error: unknown): void {
    this.logger.warn({
      operation,
      cacheKeyType: key.split(':', 1)[0],
      errorType: error instanceof Error ? error.name : 'UnknownError',
      message:
        'Catalog cache operation failed; PostgreSQL remains authoritative',
    });
  }
}
