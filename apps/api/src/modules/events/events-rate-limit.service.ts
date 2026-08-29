import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../../common/redis/redis.service';

const POLICY = { limit: 120, windowSeconds: 60 } as const;

@Injectable()
export class EventsRateLimitService {
  private readonly logger = new Logger(EventsRateLimitService.name);

  constructor(private readonly redis: RedisService) {}

  async isAllowed(identity: string): Promise<boolean> {
    const digest = createHash('sha256').update(identity).digest('hex');
    try {
      const result = await this.redis.incrementFixedWindow(
        `shopmind:rate-limit:events:v1:${digest}`,
        POLICY.windowSeconds,
      );
      return result.count <= POLICY.limit;
    } catch (error) {
      this.logger.warn({
        operation: 'event_rate_limit',
        status: 'redis_unavailable_fail_open',
        errorType: error instanceof Error ? error.name : 'UnknownError',
      });
      return true;
    }
  }
}
