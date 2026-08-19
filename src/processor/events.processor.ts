import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import Redis from 'ioredis';
import { IngestEventDto } from '../events/dto/ingest-event.dto';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Processor('events')
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async process(job: Job<IngestEventDto>): Promise<void> {
    const { tenantId, eventType } = job.data;

    await this.redis.hincrby(`events:${tenantId}`, eventType, 1);

    this.logger.log(`Processing event — tenant: ${tenantId}, type: ${eventType}`);
  }
}
