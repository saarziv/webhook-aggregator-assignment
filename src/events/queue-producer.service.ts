import { Injectable } from '@nestjs/common';
import { IngestEventDto } from './dto/ingest-event.dto';

@Injectable()
export class QueueProducerService {
  // Stub — real BullMQ enqueue logic added in next step
  enqueue(_event: IngestEventDto): void {}
}
