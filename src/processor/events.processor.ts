import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IngestEventDto } from '../events/dto/ingest-event.dto';

@Processor('events')
export class EventsProcessor extends WorkerHost {
  private readonly logger = new Logger(EventsProcessor.name);

  async process(job: Job<IngestEventDto>): Promise<void> {
    this.logger.log(
      `Processing event — tenant: ${job.data.tenantId}, type: ${job.data.eventType}`,
    );
  }
}
