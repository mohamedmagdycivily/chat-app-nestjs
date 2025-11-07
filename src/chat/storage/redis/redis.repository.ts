import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.connection';

@Injectable()
export class RedisRepository {
  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  ///////////////////////// Access Token /////////////////////////
  private getUserBlacklistedAccessTokenKey(
    userId: string | number,
    token: string,
  ): string {
    return `blacklisted-access-token:user:${userId}:${token?.split('.')?.[1]}`;
  }

  async setUserBlacklistedAccessToken(
    userId: string | number,
    token: string,
    ttl = 3600,
  ): Promise<void> {
    await this.redisClient.set(
      this.getUserBlacklistedAccessTokenKey(userId, token),
      'blacklisted',
      'EX',
      ttl,
    );
  }

  async getUserBlacklistedAccessToken(
    userId: string | number,
    token: string,
  ): Promise<string | null> {
    const data = await this.redisClient.get(
      this.getUserBlacklistedAccessTokenKey(userId, token),
    );
    return data;
  }

  async deleteUserBlacklistedAccessToken(
    userId: string | number,
    token: string,
  ): Promise<void> {
    await this.redisClient.del(
      this.getUserBlacklistedAccessTokenKey(userId, token),
    );
  }

  ///////////////////////// Refresh Token /////////////////////////
  private getUserBlacklistedRefreshTokenKey(
    userId: string | number,
    token: string,
  ): string {
    return `blacklisted-refresh-token:user:${userId}:${token?.split('.')?.[1]}`;
  }

  async setUserBlacklistedRefreshToken(
    userId: string | number,
    token: string,
    ttl = 3600,
  ): Promise<void> {
    await this.redisClient.set(
      this.getUserBlacklistedRefreshTokenKey(userId, token),
      'blacklisted',
      'EX',
      ttl,
    );
  }

  async getUserBlacklistedRefreshToken(
    userId: string | number,
    token: string,
  ): Promise<string | null> {
    const data = await this.redisClient.get(
      this.getUserBlacklistedRefreshTokenKey(userId, token),
    );
    return data;
  }

  async deleteUserBlacklistedRefreshToken(
    userId: string | number,
    token: string,
  ): Promise<void> {
    await this.redisClient.del(
      this.getUserBlacklistedRefreshTokenKey(userId, token),
    );
  }
}
