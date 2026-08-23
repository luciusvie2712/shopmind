import { RedisService } from '../redis/redis.service';
import {
  AI_RATE_LIMIT_POLICY,
  AiRateLimitService,
} from './ai-rate-limit.service';

describe('AiRateLimitService', () => {
  const incrementFixedWindow = jest.fn<
    Promise<{ readonly count: number; readonly ttlSeconds: number }>,
    [key: string, ttlSeconds: number]
  >();
  const service = new AiRateLimitService({
    incrementFixedWindow,
  } as unknown as RedisService);

  beforeEach(() => jest.clearAllMocks());

  it('allows below the fixed-window limit and rejects above it', async () => {
    incrementFixedWindow
      .mockResolvedValueOnce({ count: 1, ttlSeconds: 60 })
      .mockResolvedValueOnce({
        count: AI_RATE_LIMIT_POLICY.limit + 1,
        ttlSeconds: 37,
      });
    await expect(service.consume('ip:one')).resolves.toMatchObject({
      allowed: true,
      remaining: AI_RATE_LIMIT_POLICY.limit - 1,
      degraded: false,
    });
    await expect(service.consume('ip:one')).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 37,
      degraded: false,
    });
  });

  it('isolates identities behind bounded hashed Redis keys', async () => {
    incrementFixedWindow.mockResolvedValue({ count: 1, ttlSeconds: 60 });
    await service.consume('user:user-a');
    await service.consume('user:user-b');
    const firstKey = incrementFixedWindow.mock.calls[0][0];
    const secondKey = incrementFixedWindow.mock.calls[1][0];
    expect(firstKey).not.toBe(secondKey);
    expect(firstKey).toMatch(/^shopmind:rate-limit:ai:v1:[a-f0-9]{64}$/);
    expect(incrementFixedWindow).toHaveBeenCalledWith(
      expect.any(String),
      AI_RATE_LIMIT_POLICY.windowSeconds,
    );
  });

  it('deterministically fails open when Redis is unavailable', async () => {
    incrementFixedWindow.mockRejectedValue(new Error('Redis unavailable'));
    await expect(service.consume('ip:offline')).resolves.toMatchObject({
      allowed: true,
      degraded: true,
    });
  });
});
