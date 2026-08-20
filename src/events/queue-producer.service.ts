import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestEventDto } from './dto/ingest-event.dto';

const PROCESSING_DELAY_MS = 200;

@Injectable()
export class QueueProducerService {
  constructor(@InjectQueue('events') private readonly eventsQueue: Queue) {}

  async enqueue(event: IngestEventDto): Promise<void> {
    await this.eventsQueue.add('process-event', event, {
      delay: PROCESSING_DELAY_MS,
    });
  }
}
