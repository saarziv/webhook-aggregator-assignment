import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { RateLimiterService } from './rate-limiter.service';
import { QueueProducerService } from './queue-producer.service';

@Module({
  controllers: [EventsController],
  providers: [RateLimiterService, QueueProducerService],
})
export class EventsModule {}
