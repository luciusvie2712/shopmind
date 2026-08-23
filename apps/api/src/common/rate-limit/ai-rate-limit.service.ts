import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../redis/redis.service';

export const AI_RATE_LIMIT_POLICY = {
  limit: 30,
  windowSeconds: 60,
  namespace: 'shopmind:rate-limit:ai:v1',
  redisFailure: 'fail-open',
} as const;

export interface AiRateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
  readonly degraded: boolean;
}

@Injectable()
export class AiRateLimitService {
  private readonly logger = new Logger(AiRateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  async consume(identity: string): Promise<AiRateLimitDecision> {
    const key = this.keyFor(identity);
    try {
      const window = await this.redis.incrementFixedWindow(
        key,
        AI_RATE_LIMIT_POLICY.windowSeconds,
      );
      return {
        allowed: window.count <= AI_RATE_LIMIT_POLICY.limit,
        remaining: Math.max(AI_RATE_LIMIT_POLICY.limit - window.count, 0),
        retryAfterSeconds: Math.max(window.ttlSeconds, 1),
        degraded: false,
      };
    } catch (error) {
      this.logger.warn({
        operation: 'ai_rate_limit',
        status: 'redis_unavailable_fail_open',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      return {
        allowed: true,
        remaining: AI_RATE_LIMIT_POLICY.limit,
        retryAfterSeconds: 0,
        degraded: true,
      };
    }
  }

  keyFor(identity: string): string {
    const digest = createHash('sha256').update(identity).digest('hex');
    return `${AI_RATE_LIMIT_POLICY.namespace}:${digest}`;
  }
}
