import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventsModule } from './events/events.module';
import { ProcessorModule } from './processor/processor.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { StoreModule } from './store/store.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventsModule,
    ProcessorModule,
    AnalyticsModule,
    StoreModule,
  ],
})
export class AppModule {}
