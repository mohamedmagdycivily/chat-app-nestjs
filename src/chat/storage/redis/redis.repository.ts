import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.connection';

@Injectable()
export class RedisRepository {
  private readonly MESSAGE_LOCK_EXPIRY_SECONDS = 86400; // 1 day

  // Lua script for atomic lock + increment
  private readonly ATOMIC_INCREMENT_SCRIPT = `
    local wasSet = redis.call('SET', KEYS[1], 1, 'EX', ARGV[1], 'NX')
    if wasSet then
      redis.call('INCR', KEYS[2])
      return 1
    end
    return 0
  `;

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  ///////////////////////// Chat App - Chat Number Generator /////////////////////////

  /**
   * Get the next unique chat number for an app
   * Uses INCR on app:{id}:chat_number_generator
   */
  private getChatNumberGeneratorKey(app_id: number): string {
    return `app:${app_id}:chat_number_generator`;
  }

  async getNextChatNumber(app_id: number): Promise<number> {
    return await this.redisClient.incr(this.getChatNumberGeneratorKey(app_id));
  }

  ///////////////////////// Chat App - Actual Chat Count /////////////////////////

  /**
   * Actual chat count key for background sync
   * Format: app:{id}:chat_count_actual
   */
  private getChatCountActualKey(app_id: number): string {
    return `app:${app_id}:chat_count_actual`;
  }

  /**
   * Get the processing lock key for a message
   * Format: processed_for_count:{message_id}
   */
  private getMessageLockKey(messageId: string): string {
    return `processed_for_count:${messageId}`;
  }

  /**
   * Atomically check lock and increment counter using Lua script
   * Returns 1 if work was done (new message), 0 if duplicate
   */
  async atomicLockAndIncrementChatCount(
    messageId: string,
    app_id: number,
  ): Promise<number> {
    const redisLockKey = this.getMessageLockKey(messageId);
    const counterKey = this.getChatCountActualKey(app_id);

    const result = await this.redisClient.eval(
      this.ATOMIC_INCREMENT_SCRIPT,
      2, // Number of KEYS
      redisLockKey, // KEYS[1]
      counterKey, // KEYS[2]
      this.MESSAGE_LOCK_EXPIRY_SECONDS, // ARGV[1]
    );

    return result as number;
  }

  /**
   * Get the actual chat count for an app
   */
  async getChatCountActual(app_id: number): Promise<number> {
    const count = await this.redisClient.get(
      this.getChatCountActualKey(app_id),
    );
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Get all actual chat counts for syncing to MySQL
   * Returns format: { "app:1:chat_count_actual": "5", "app:2:chat_count_actual": "10" }
   */
  async getAllActualChatCounts(): Promise<Record<string, string>> {
    const keys = await this.redisClient.keys('app:*:chat_count_actual');
    if (keys.length === 0) {
      return {};
    }

    const values = await this.redisClient.mget(...keys);
    const result: Record<string, string> = {};

    keys.forEach((key, index) => {
      if (values[index] !== null) {
        result[key] = values[index];
      }
    });

    return result;
  }

  ///////////////////////// Chat App - Apps (Legacy - for reference) /////////////////////////
  private readonly APPS_KEY = 'apps';

  private getAppRedisKey(token: number): string {
    return `a_t_${token}`;
  }

  async initializeApp(token: number): Promise<boolean> {
    // Returns 1 if field is new, 0 if it already existed
    const result = await this.redisClient.hsetnx(
      this.APPS_KEY,
      this.getAppRedisKey(token),
      0,
    );
    return result === 1;
  }

  async appExists(token: number): Promise<boolean> {
    const exists = await this.redisClient.hexists(
      this.APPS_KEY,
      this.getAppRedisKey(token),
    );
    return exists === 1;
  }

  async incrementChatCount(token: number): Promise<number> {
    return await this.redisClient.hincrby(
      this.APPS_KEY,
      this.getAppRedisKey(token),
      1,
    );
  }

  async getChatCount(token: number): Promise<number> {
    const count = await this.redisClient.hget(
      this.APPS_KEY,
      this.getAppRedisKey(token),
    );
    return count ? parseInt(count, 10) : 0;
  }

  async getAllAppCounts(): Promise<Record<string, string>> {
    return await this.redisClient.hgetall(this.APPS_KEY);
  }

  ///////////////////////// Chat App - Chats /////////////////////////
  private readonly CHATS_KEY = 'chats';

  private getChatRedisKey(app_id: number, chat_number: number): string {
    return `aid_${app_id}_cnum_${chat_number}`;
  }

  async initializeChat(app_id: number, chat_number: number): Promise<boolean> {
    const result = await this.redisClient.hsetnx(
      this.CHATS_KEY,
      this.getChatRedisKey(app_id, chat_number),
      0,
    );
    return result === 1;
  }

  async incrementMessageCount(
    app_id: number,
    chat_number: number,
  ): Promise<number> {
    return await this.redisClient.hincrby(
      this.CHATS_KEY,
      this.getChatRedisKey(app_id, chat_number),
      1,
    );
  }

  async getMessageCount(app_id: number, chat_number: number): Promise<number> {
    const count = await this.redisClient.hget(
      this.CHATS_KEY,
      this.getChatRedisKey(app_id, chat_number),
    );
    return count ? parseInt(count, 10) : 0;
  }

  async getAllChatCounts(): Promise<Record<string, string>> {
    return await this.redisClient.hgetall(this.CHATS_KEY);
  }

  ///////////////////////// Chat App - Message Number Generator /////////////////////////

  /**
   * Get the next unique message number for a chat
   * Uses INCR on chat:{chat_id}:message_number_generator
   */
  private getMessageNumberGeneratorKey(chat_id: number): string {
    return `chat:${chat_id}:message_number_generator`;
  }

  async getNextMessageNumber(chat_id: number): Promise<number> {
    return await this.redisClient.incr(
      this.getMessageNumberGeneratorKey(chat_id),
    );
  }

  ///////////////////////// Chat App - Actual Message Count /////////////////////////

  /**
   * Actual message count key for background sync
   * Format: chat:{chat_id}:message_count_actual
   */
  private getMessageCountActualKey(chat_id: number): string {
    return `chat:${chat_id}:message_count_actual`;
  }

  /**
   * Atomically check lock and increment message counter using Lua script
   * Returns 1 if work was done (new message), 0 if duplicate
   */
  async atomicLockAndIncrementMessageCount(
    messageId: string,
    chat_id: number,
  ): Promise<number> {
    const redisLockKey = this.getMessageLockKey(messageId);
    const counterKey = this.getMessageCountActualKey(chat_id);

    const result = await this.redisClient.eval(
      this.ATOMIC_INCREMENT_SCRIPT,
      2, // Number of KEYS
      redisLockKey, // KEYS[1]
      counterKey, // KEYS[2]
      this.MESSAGE_LOCK_EXPIRY_SECONDS, // ARGV[1]
    );

    return result as number;
  }

  /**
   * Get the actual message count for a chat
   */
  async getMessageCountActual(chat_id: number): Promise<number> {
    const count = await this.redisClient.get(
      this.getMessageCountActualKey(chat_id),
    );
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * Get all actual message counts for syncing to MySQL
   * Returns format: { "chat:1:message_count_actual": "5", "chat:2:message_count_actual": "10" }
   */
  async getAllActualMessageCounts(): Promise<Record<string, string>> {
    const keys = await this.redisClient.keys('chat:*:message_count_actual');
    if (keys.length === 0) {
      return {};
    }

    const values = await this.redisClient.mget(...keys);
    const result: Record<string, string> = {};

    keys.forEach((key, index) => {
      if (values[index] !== null) {
        result[key] = values[index];
      }
    });

    return result;
  }
}
