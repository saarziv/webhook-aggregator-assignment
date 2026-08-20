import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export interface TenantAnalytics {
  tenantId: string;
  eventBreakdown: Record<string, number>;
  rateLimitedCount: number;
}

@Injectable()
export class AnalyticsService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getAnalytics(tenantId: string): Promise<TenantAnalytics> {
    const [rawEventCounts, rateLimitedCount] = await Promise.all([
      this.redis.hgetall(`events:${tenantId}`),
      this.getRateLimitedCount(tenantId),
    ]);

    const eventBreakdown = rawEventCounts
      ? Object.fromEntries(
          Object.entries(rawEventCounts).map(([type, count]) => [type, Number(count)]),
        )
      : {};

    return { tenantId, eventBreakdown, rateLimitedCount };
  }

  private async getRateLimitedCount(tenantId: string): Promise<number> {
    const windowStart = Date.now() - FIFTEEN_MINUTES_MS;
    return this.redis.zcount(`rate_limited:${tenantId}`, windowStart, '+inf');
  }
}
