import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

describe('RateLimiterService (unit)', () => {
  let service: RateLimiterService;
  let mockRedis: { eval: jest.Mock };

  const WINDOW_MS = '1000';
  const MAX_REQUESTS = '5';

  beforeEach(async () => {
    mockRedis = { eval: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
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

  it('should return false when Lua script returns 0 (allowed)', async () => {
    mockRedis.eval.mockResolvedValue(0);

    const isLimited = await service.isRateLimited('tenant-1');

    expect(isLimited).toBe(false);
  });

  it('should return true when Lua script returns 1 (blocked)', async () => {
    mockRedis.eval.mockResolvedValue(1);

    const isLimited = await service.isRateLimited('tenant-1');

    expect(isLimited).toBe(true);
  });

  it('should pass the correct Redis key based on tenantId', async () => {
    mockRedis.eval.mockResolvedValue(0);

    await service.isRateLimited('tenant-abc');

    // eval(script, numkeys, key, ...args)
    const numkeys = mockRedis.eval.mock.calls[0][1];
    const redisKey = mockRedis.eval.mock.calls[0][2];
    expect(numkeys).toBe(1);
    expect(redisKey).toBe('rate_limit:tenant-abc');
  });

  it('should pass windowMs and maxRequests from config to the Lua script', async () => {
    mockRedis.eval.mockResolvedValue(0);

    await service.isRateLimited('tenant-1');

    // eval(script, numkeys, key, windowMs, maxRequests, now, member)
    const callArgs = mockRedis.eval.mock.calls[0];
    expect(callArgs[3]).toBe(Number(WINDOW_MS));
    expect(callArgs[4]).toBe(Number(MAX_REQUESTS));
  });

  it('should use custom config values when provided', async () => {
    const customWindowMs = '2000';
    const customMaxRequests = '10';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string, defaultValue: string) => {
              const config: Record<string, string> = {
                RATE_LIMIT_WINDOW_MS: customWindowMs,
                RATE_LIMIT_MAX_REQUESTS: customMaxRequests,
              };
              return config[key] ?? defaultValue;
            },
          },
        },
      ],
    }).compile();

    const customService = module.get<RateLimiterService>(RateLimiterService);
    mockRedis.eval.mockResolvedValue(0);

    await customService.isRateLimited('tenant-1');

    const callArgs = mockRedis.eval.mock.calls[0];
    expect(callArgs[3]).toBe(Number(customWindowMs));
    expect(callArgs[4]).toBe(Number(customMaxRequests));
  });
});
