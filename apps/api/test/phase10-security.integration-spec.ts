import {
  Controller,
  Get,
  type INestApplication,
  type LoggerService,
  Module,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Queue, Worker, type Job } from 'bullmq';
import type { Request } from 'express';
import request from 'supertest';
import { configureHttpApplication } from '../src/common/http/configure-http-application';
import { queueConnectionOptions } from '../src/common/queue/queue.connection';
import { registerWorkerObservability } from '../src/common/queue/worker-observability';
import { AiRateLimitGuard } from '../src/common/rate-limit/ai-rate-limit.guard';
import { AiRateLimitModule } from '../src/common/rate-limit/ai-rate-limit.module';
import {
  AI_RATE_LIMIT_POLICY,
  AiRateLimitService,
} from '../src/common/rate-limit/ai-rate-limit.service';
import { RedisModule } from '../src/common/redis/redis.module';
import { RedisService } from '../src/common/redis/redis.service';

@Controller('ai/security-probe')
@UseGuards(AiRateLimitGuard)
class RateLimitProbeController {
  @Get()
  probe(@Req() requestValue: Request): { readonly ip: string } {
    return { ip: requestValue.ip ?? 'unknown' };
  }
}

@Module({
  imports: [RedisModule, AiRateLimitModule],
  controllers: [RateLimitProbeController],
})
class PhaseTenTestModule {}

const silentLogger: LoggerService = {
  log: () => undefined,
  error: () => undefined,
  warn: () => undefined,
};

describe('Phase 10 security integration', () => {
  let app: INestApplication;
  let redis: RedisService;
  let rateLimits: AiRateLimitService;
  let probeKey: string | undefined;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PhaseTenTestModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureHttpApplication(app, silentLogger);
    await app.init();
    redis = app.get(RedisService);
    rateLimits = app.get(AiRateLimitService);
  });

  afterEach(async () => {
    const keys = [
      probeKey,
      rateLimits.keyFor('user:phase10-a'),
      rateLimits.keyFor('user:phase10-b'),
    ].filter((key): key is string => key !== undefined);
    await redis.deleteKeys(keys);
    probeKey = undefined;
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
  });

  it('allows below the limit then returns a stable 429 envelope', async () => {
    const discovery = await request(app.getHttpServer())
      .get('/api/v1/ai/security-probe')
      .expect(200);
    probeKey = rateLimits.keyFor(`ip:${String(discovery.body.ip)}`);
    await redis.deleteKeys([probeKey]);

    for (let count = 0; count < AI_RATE_LIMIT_POLICY.limit; count += 1) {
      await request(app.getHttpServer())
        .get('/api/v1/ai/security-probe')
        .expect(200);
    }
    const limited = await request(app.getHttpServer())
      .get('/api/v1/ai/security-probe')
      .set('x-request-id', 'phase10-limited')
      .expect(429);
    expect(limited.headers['retry-after']).toEqual(expect.any(String));
    expect(limited.body.error).toEqual({
      code: 'AI_RATE_LIMITED',
      message: 'AI request limit exceeded; retry later',
      requestId: 'phase10-limited',
    });
    const ttl = await redis.ttl(probeKey);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(AI_RATE_LIMIT_POLICY.windowSeconds);
  });

  it('isolates authenticated identities in Redis', async () => {
    for (let count = 0; count < AI_RATE_LIMIT_POLICY.limit; count += 1) {
      await rateLimits.consume('user:phase10-a');
    }
    await expect(rateLimits.consume('user:phase10-a')).resolves.toMatchObject({
      allowed: false,
    });
    await expect(rateLimits.consume('user:phase10-b')).resolves.toMatchObject({
      allowed: true,
    });
  });

  it('retains a failed BullMQ job and supports a safe retry', async () => {
    const queueName = `phase10-observability-${Date.now()}`;
    const queue = new Queue(queueName, {
      connection: queueConnectionOptions(),
    });
    let shouldFail = true;
    const worker = new Worker(
      queueName,
      async () => {
        if (shouldFail) throw new TypeError('controlled-test-failure');
        return { status: 'recovered' };
      },
      { connection: queueConnectionOptions(), concurrency: 1 },
    );
    const logger: LoggerService = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    registerWorkerObservability(worker, logger);

    try {
      await Promise.all([queue.waitUntilReady(), worker.waitUntilReady()]);
      const failed = new Promise<Job>((resolve) => {
        worker.on('failed', (job) => {
          if (job?.attemptsMade === 2) resolve(job);
        });
      });
      const created = await queue.add(
        'CONTROLLED_FAILURE',
        {},
        {
          attempts: 2,
          backoff: { type: 'fixed', delay: 1 },
          removeOnFail: { age: 3_600, count: 10 },
          removeOnComplete: false,
        },
      );
      const failedJob = await failed;
      expect(failedJob.id).toBe(created.id);
      expect(failedJob.attemptsMade).toBe(2);
      const retained = await queue.getJob(created.id ?? 'missing');
      expect(retained).not.toBeNull();
      await expect(retained?.getState()).resolves.toBe('failed');
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          queue: queueName,
          jobId: created.id,
          attempt: 2,
          status: 'failed',
          latencyMs: expect.any(Number),
          errorType: 'TypeError',
        }),
      );

      shouldFail = false;
      const completed = new Promise<Job>((resolve) =>
        worker.once('completed', resolve),
      );
      await failedJob.retry();
      const recovered = await completed;
      expect(recovered.id).toBe(created.id);
      await expect(recovered.getState()).resolves.toBe('completed');
    } finally {
      await worker.close();
      await queue.obliterate({ force: true });
      await queue.close();
    }
  }, 15_000);
});
