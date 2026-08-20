import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RateLimiterService } from './rate-limiter.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('RateLimiterService (integration)', () => {
  let service: RateLimiterService;
  let redisClient: Redis;

  const WINDOW_MS = '1000';
  const MAX_REQUESTS = '5';
  const TEST_KEY_PREFIX = 'rate_limit:test-tenant';

  beforeAll(async () => {
    redisClient = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        { provide: REDIS_CLIENT, useValue: redisClient },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: string) => {
              const config: Record<string, string> = {
                RATE_LIMIT_WINDOW_MS: WINDOW_MS,
                RATE_LIMIT_MAX_REQUESTS: MAX_REQUESTS,
              };
              return config[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  beforeEach(async () => {
    // Clean up any test keys before each test
    const keys = await redisClient.keys(`${TEST_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  });

  afterAll(async () => {
    const keys = await redisClient.keys(`${TEST_KEY_PREFIX}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    await redisClient.quit();
  });

  it('should allow the first request', async () => {
    const isLimited = await service.isRateLimited('test-tenant-1');

    expect(isLimited).toBe(false);
  });

  it('should allow exactly 5 requests within the window', async () => {
    const tenantId = 'test-tenant-2';

    for (let i = 0; i < Number(MAX_REQUESTS); i++) {
      const isLimited = await service.isRateLimited(tenantId);
      expect(isLimited).toBe(false);
    }
  });

  it('should block the 6th request within the window', async () => {
    const tenantId = 'test-tenant-3';

    for (let i = 0; i < Number(MAX_REQUESTS); i++) {
      await service.isRateLimited(tenantId);
    }

    const isLimited = await service.isRateLimited(tenantId);

    expect(isLimited).toBe(true);
  });

  it('should allow requests again after the window expires', async () => {
    const shortWindowMs = '200';

    // Create a service with a short window for this test
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        { provide: REDIS_CLIENT, useValue: redisClient },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: string) => {
              const config: Record<string, string> = {
                RATE_LIMIT_WINDOW_MS: shortWindowMs,
                RATE_LIMIT_MAX_REQUESTS: MAX_REQUESTS,
              };
              return config[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    const shortWindowService =
      module.get<RateLimiterService>(RateLimiterService);
    const tenantId = 'test-tenant-4';

    // Exhaust the limit
    for (let i = 0; i < Number(MAX_REQUESTS); i++) {
      await shortWindowService.isRateLimited(tenantId);
    }

    // Confirm blocked
    expect(await shortWindowService.isRateLimited(tenantId)).toBe(true);

    // Wait for the window to expire
    await new Promise((resolve) =>
      setTimeout(resolve, Number(shortWindowMs) + 50),
    );

    // Should be allowed again
    expect(await shortWindowService.isRateLimited(tenantId)).toBe(false);
  });

  it('should not let different tenants interfere with each other', async () => {
    const tenantA = 'test-tenant-5a';
    const tenantB = 'test-tenant-5b';

    // Exhaust tenant A's limit
    for (let i = 0; i < Number(MAX_REQUESTS); i++) {
      await service.isRateLimited(tenantA);
    }

    expect(await service.isRateLimited(tenantA)).toBe(true);
    expect(await service.isRateLimited(tenantB)).toBe(false);
  });

  it('should block all requests beyond the limit within the same window', async () => {
    const tenantId = 'test-tenant-6';

    // Exhaust the limit
    for (let i = 0; i < Number(MAX_REQUESTS); i++) {
      await service.isRateLimited(tenantId);
    }

    // The 6th, 7th, and 8th requests should all be blocked
    expect(await service.isRateLimited(tenantId)).toBe(true);
    expect(await service.isRateLimited(tenantId)).toBe(true);
    expect(await service.isRateLimited(tenantId)).toBe(true);
  });
});
