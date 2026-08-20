import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AnalyticsService } from './analytics.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

describe('AnalyticsService (unit)', () => {
  let service: AnalyticsService;
  let mockRedis: { hgetall: jest.Mock; zcount: jest.Mock };

  beforeEach(async () => {
    mockRedis = {
      hgetall: jest.fn(),
      zcount: jest.fn().mockResolvedValue(0),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: REDIS_CLIENT, useValue: mockRedis },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, defaultValue: string) => defaultValue },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should return eventBreakdown with numeric counts from HGETALL', async () => {
    // Redis HGETALL always returns string values — service must parse them
    mockRedis.hgetall.mockResolvedValue({
      'email.sent': '5',
      'email.failed': '2',
      'account.updated': '1',
    });

    const result = await service.getAnalytics('tenant-1');

    expect(result.eventBreakdown).toEqual({
      'email.sent': 5,
      'email.failed': 2,
      'account.updated': 1,
    });
  });

  it('should return empty eventBreakdown when HGETALL returns null (no events yet)', async () => {
    mockRedis.hgetall.mockResolvedValue(null);

    const result = await service.getAnalytics('tenant-1');

    expect(result.eventBreakdown).toEqual({});
  });

  it('should return empty eventBreakdown when HGETALL returns empty object', async () => {
    mockRedis.hgetall.mockResolvedValue({});

    const result = await service.getAnalytics('tenant-1');

    expect(result.eventBreakdown).toEqual({});
  });

  it('should return rateLimitedCount from ZCOUNT', async () => {
    mockRedis.hgetall.mockResolvedValue(null);
    mockRedis.zcount.mockResolvedValue(3);

    const result = await service.getAnalytics('tenant-1');

    expect(result.rateLimitedCount).toBe(3);
  });

  it('should query ZCOUNT with the correct key and 15-minute window', async () => {
    mockRedis.hgetall.mockResolvedValue(null);
    mockRedis.zcount.mockResolvedValue(0);

    const before = Date.now();
    await service.getAnalytics('tenant-1');
    const after = Date.now();

    expect(mockRedis.zcount).toHaveBeenCalledTimes(1);
    const [key, min, max] = mockRedis.zcount.mock.calls[0];
    expect(key).toBe('rate_limited:tenant-1');
    expect(max).toBe('+inf');
    // min should be approximately now - 15 minutes (within 100ms tolerance)
    expect(Number(min)).toBeGreaterThanOrEqual(before - FIFTEEN_MINUTES_MS - 100);
    expect(Number(min)).toBeLessThanOrEqual(after - FIFTEEN_MINUTES_MS + 100);
  });

  it('should include tenantId in the response', async () => {
    mockRedis.hgetall.mockResolvedValue(null);

    const result = await service.getAnalytics('tenant-abc');

    expect(result.tenantId).toBe('tenant-abc');
  });

  it('should return combined eventBreakdown and rateLimitedCount together', async () => {
    mockRedis.hgetall.mockResolvedValue({ 'email.sent': '10' });
    mockRedis.zcount.mockResolvedValue(4);

    const result = await service.getAnalytics('tenant-1');

    expect(result).toEqual({
      tenantId: 'tenant-1',
      eventBreakdown: { 'email.sent': 10 },
      rateLimitedCount: 4,
    });
  });
});
