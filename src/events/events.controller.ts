import { Body, Controller, HttpCode, HttpException, HttpStatus, Inject, Post } from '@nestjs/common';
import Redis from 'ioredis';
import { IngestEventDto } from './dto/ingest-event.dto';
import { RateLimiterService } from './rate-limiter.service';
import { QueueProducerService } from './queue-producer.service';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Controller('v1/events')
export class EventsController {
  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly queueProducerService: QueueProducerService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  async ingestEvent(@Body() dto: IngestEventDto): Promise<{ status: string }> {
    if (await this.rateLimiterService.isRateLimited(dto.tenantId)) {
      try {
        await this.trackBlockedRequest(dto.tenantId);
      } catch {
        // tracking failure must not affect the 429 response
      }
      throw new HttpException('Rate limit exceeded for tenant', HttpStatus.TOO_MANY_REQUESTS);
    }

    await this.queueProducerService.enqueue(dto);

    return { status: 'queued' };
  }

  // Records the timestamp of each blocked request so analytics can count
  // rate-limited events within a time window (e.g. last 15 minutes).
  // Cleans up entries older than 15 minutes to prevent unbounded Redis growth.
  private async trackBlockedRequest(tenantId: string): Promise<void> {
    const now = Date.now();
    const key = `rate_limited:${tenantId}`;
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
    const fifteenMinutesAgo = now - 15 * 60 * 1000;
    await this.redis.zadd(key, now, member);
    await this.redis.zremrangebyscore(key, '-inf', fifteenMinutesAgo);
  }
}
