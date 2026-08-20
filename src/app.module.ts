import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventsModule } from './events/events.module';
import { ProcessorModule } from './processor/processor.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    RedisModule,
    // BullMQ manages its own dedicated Redis connection pool — separate from the
    // ioredis client used by the rate limiter, since workers need blocking calls
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    EventsModule,
    ProcessorModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
