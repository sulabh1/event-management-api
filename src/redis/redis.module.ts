import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { LoggerService } from '@/common/logger/logger.service';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        const redis = new Redis({
          host: process.env.REDIS_HOST ?? 'localhost',
          port: process.env.REDIS_PORT
            ? parseInt(process.env.REDIS_PORT, 10)
            : 6379,
          password:
            process.env.REDIS_PASSWORD !== undefined
              ? process.env.REDIS_PASSWORD
              : undefined,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        redis.on('connect', () => {
          new LoggerService().log('Redis connected successfully');
        });

        redis.on('error', (error) => {
          new LoggerService().error(error.message);
        });

        return redis;
      },
    },
  ],
  exports: ['REDIS_CLIENT', RedisService],
})
export class RedisModule {}
