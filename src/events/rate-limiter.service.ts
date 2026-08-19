import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

// Lua script runs atomically on Redis — no race condition between
// checking the count and adding the new entry.
// KEYS[1] = sorted set key for the tenant
// ARGV[1] = windowMs, ARGV[2] = maxRequests, ARGV[3] = now, ARGV[4] = unique member
const SLIDING_WINDOW_LUA = `
  local windowStart = tonumber(ARGV[3]) - tonumber(ARGV[1])
  redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', windowStart)
  local currentCount = redis.call('ZCARD', KEYS[1])
  if currentCount >= tonumber(ARGV[2]) then
    return 1
  end
  redis.call('ZADD', KEYS[1], tonumber(ARGV[3]), ARGV[4])
  return 0
`;

@Injectable()
export class RateLimiterService {
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService,
  ) {
    this.windowMs = Number(configService.get('RATE_LIMIT_WINDOW_MS', '1000'));
    this.maxRequests = Number(
      configService.get('RATE_LIMIT_MAX_REQUESTS', '5'),
    );
  }

  async isRateLimited(tenantId: string): Promise<boolean> {
    const key = `rate_limit:${tenantId}`;
    const now = Date.now();
    const uniqueMember = `${now}:${Math.random().toString(36).slice(2, 8)}`;

    const blocked = await this.redis.eval(
      SLIDING_WINDOW_LUA,
      1,
      key,
      this.windowMs,
      this.maxRequests,
      now,
      uniqueMember,
    );

    return blocked === 1;
  }
}
