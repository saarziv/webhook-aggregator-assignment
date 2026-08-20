import { Global, Inject, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

// Manages ioredis lifecycle: PING on init, quit on destroy.
// Declared as a provider so NestJS runs its hooks — the client itself is the
// injectable value, but NestJS only runs hooks on class instances.
class RedisLifecycleService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RedisModule');

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.client.ping();
      this.logger.log('Redis PING successful');
    } catch (error) {
      this.logger.error('Redis PING failed', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        return new Redis({
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        });
      },
      inject: [ConfigService],
    },
    RedisLifecycleService,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
