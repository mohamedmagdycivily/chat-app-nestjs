import { Module } from '@nestjs/common';
import { RedisRepository } from './redis.repository';
import { RedisProvider } from './redis.connection';

@Module({
  providers: [RedisProvider, RedisRepository],
  exports: [RedisRepository],
})
export class RedisModule {}
