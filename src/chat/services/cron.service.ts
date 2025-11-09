import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisRepository } from '../storage/redis/redis.repository';
import { AppRepository } from '../storage/main/repositories/app.repository';
import { ChatRepository } from '../storage/main/repositories/chat.repository';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly redisRepository: RedisRepository,
    private readonly appRepository: AppRepository,
    private readonly chatRepository: ChatRepository,
  ) {}

  // ⏰ Cron Job: Sync actual chat counts from Redis to MySQL
  // Run every 30 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncActualChatCounts() {
    this.logger.log(' Starting actual chat counts sync from Redis to MySQL');

    try {
      const redisCounts = await this.redisRepository.getAllActualChatCounts();
      const updates: Array<{ id: number; chat_count: number }> = [];

      for (const [redisKey, chatCount] of Object.entries(redisCounts)) {
        // Extract app_id from redis key (format: "app:1:chat_count_actual")
        const parts = redisKey.split(':');
        const app_id = parseInt(parts[1], 10);
        const count = parseInt(chatCount, 10);

        // Skip records where chat_count is 0
        if (count === 0 || isNaN(app_id)) {
          continue;
        }

        updates.push({ id: app_id, chat_count: count });
      }

      if (updates.length > 0) {
        try {
          await this.appRepository.bulkUpdateChatCounts(updates);
          this.logger.log(
            `⏰ Actual chat counts sync completed: ${updates.length} records updated in a single query`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to bulk update chat counts: ${error.message}`,
            error.stack,
          );
        }
      } else {
        this.logger.log('⏰ No chat counts to sync');
      }
    } catch (error) {
      this.logger.error(
        `❌ Error syncing actual chat counts: ${error.message}`,
        error.stack,
      );
    }
  }

  // ⏰ Cron Job: Sync actual message counts from Redis to MySQL
  // Run every 30 minutes (offset by 15 minutes from app sync)
  @Cron('*/6 * * * *')
  async syncActualMessageCounts() {
    this.logger.log(
      '⏰ Starting actual message counts sync from Redis to MySQL',
    );

    try {
      const redisCounts =
        await this.redisRepository.getAllActualMessageCounts();
      const updates: Array<{ id: number; message_count: number }> = [];

      for (const [redisKey, messageCount] of Object.entries(redisCounts)) {
        // Extract chat_id from redis key (format: "chat:1:message_count_actual")
        const parts = redisKey.split(':');
        const chat_id = parseInt(parts[1], 10);
        const count = parseInt(messageCount, 10);

        // Skip records where message_count is 0
        if (count === 0 || isNaN(chat_id)) {
          continue;
        }

        updates.push({ id: chat_id, message_count: count });
      }

      if (updates.length > 0) {
        try {
          await this.chatRepository.bulkUpdateMessageCounts(updates);
          this.logger.log(
            `⏰ Actual message counts sync completed: ${updates.length} records updated in a single query`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to bulk update message counts: ${error.message}`,
            error.stack,
          );
        }
      } else {
        this.logger.log('⏰ No message counts to sync');
      }
    } catch (error) {
      this.logger.error(
        `❌ Error syncing actual message counts: ${error.message}`,
        error.stack,
      );
    }
  }
}
