import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { RedisService } from '../../common/redis/redis.service';

type DependencyStatus = 'up' | 'down';

export interface HealthResult {
  readonly status: 'ok' | 'error';
  readonly checks: {
    readonly database: DependencyStatus;
    readonly redis: DependencyStatus;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthResult> {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);
    const checks = {
      database: database.status === 'fulfilled' ? 'up' : 'down',
      redis: redis.status === 'fulfilled' ? 'up' : 'down',
    } as const;

    return {
      status:
        checks.database === 'up' && checks.redis === 'up' ? 'ok' : 'error',
      checks,
    };
  }
}
