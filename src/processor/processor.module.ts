import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventsProcessor } from './events.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'events' })],
  providers: [EventsProcessor],
})
export class ProcessorModule {}
