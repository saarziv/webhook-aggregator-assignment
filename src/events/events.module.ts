import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsController } from './events.controller';
import { RateLimiterService } from './rate-limiter.service';
import { QueueProducerService } from './queue-producer.service';

@Module({
  imports: [BullModule.registerQueue({ name: 'events' })],
  controllers: [EventsController],
  providers: [RateLimiterService, QueueProducerService],
})
export class EventsModule {}
