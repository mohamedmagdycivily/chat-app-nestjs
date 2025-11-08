import { Module, Provider } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';
import { Logger } from '@nestjs/common';
export const REDIS_CLIENT = 'REDIS_CLIENT';

export const RedisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    const logger = new Logger('RedisConnection');
    const config: RedisOptions = {
      sentinels: [
        {
          host: process.env.REDIS_HOST,
          port: Number(process.env.REDIS_PORT),
        },
      ],
      password: process.env.REDIS_PASSWORD,
      sentinelPassword: process.env.REDIS_PASSWORD,
      name: 'mymaster',
      connectTimeout: 10000,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    };

    if (process.env.NODE_ENV !== 'production' || process.env.REGULAR_REDIS) {
      config.host = process.env.REDIS_HOST;
      config.port = Number(process.env.REDIS_PORT);

      delete config.sentinels;
      delete config.name;
      delete config.sentinelPassword;
    }

    const redisClient = new Redis(config);

    redisClient.on('error', (err) =>
      logger.error('Redis connection error:', err.message),
    );
    redisClient.on('connect', () => logger.log('Connected to Redis'));
    return redisClient;
  },
};

@Module({
  providers: [RedisProvider],
  exports: [RedisProvider],
})
export class RedisConnection {}
