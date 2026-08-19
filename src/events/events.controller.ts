import { Controller, Post } from '@nestjs/common';

@Controller('v1/events')
export class EventsController {
  @Post()
  ingestEvent(): { message: string } {
    return { message: 'hello' };
  }
}
