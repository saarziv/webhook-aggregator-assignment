import { Body, Controller, HttpCode, HttpStatus, HttpException, Post } from '@nestjs/common';
import { IngestEventDto } from './dto/ingest-event.dto';
import { RateLimiterService } from './rate-limiter.service';
import { QueueProducerService } from './queue-producer.service';

@Controller('v1/events')
export class EventsController {
  constructor(
    private readonly rateLimiterService: RateLimiterService,
    private readonly queueProducerService: QueueProducerService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  ingestEvent(@Body() dto: IngestEventDto): { status: string } {
    if (this.rateLimiterService.isRateLimited(dto.tenantId)) {
      throw new HttpException('Rate limit exceeded for tenant', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.queueProducerService.enqueue(dto);

    return { status: 'queued' };
  }
}
