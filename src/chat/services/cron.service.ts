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
  @Cron(CronExpression.EVERY_30_MINUTES)
  async syncActualChatCounts() {
    this.logger.log(
      '🌟 🌟 🌟 🌟 🌟 Starting actual chat counts sync from Redis to MySQL',
    );

    try {
      const redisCounts = await this.redisRepository.getAllActualChatCounts();
      let updatedCount = 0;

      for (const [redisKey, chatCount] of Object.entries(redisCounts)) {
        // Extract app_id from redis key (format: "app:1:chat_count_actual")
        const parts = redisKey.split(':');
        const app_id = parseInt(parts[1], 10);
        const count = parseInt(chatCount, 10);

        // Skip records where chat_count is 0
        if (count === 0 || isNaN(app_id)) {
          continue;
        }

        try {
          await this.appRepository.updateChatCount(app_id, count);
          updatedCount++;
          this.logger.log(
            `🌟 🌟 🌟 🌟 🌟 Updated app ${app_id} with chat_count: ${count}`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to update app ${app_id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `⏰ Actual chat counts sync completed: ${updatedCount} records updated`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error syncing actual chat counts: ${error.message}`,
        error.stack,
      );
    }
  }

  // ⏰ Cron Job: Sync actual message counts from Redis to MySQL
  // Run every 30 minutes (offset by 15 minutes from app sync)
  @Cron('15,45 * * * *')
  async syncActualMessageCounts() {
    this.logger.log(
      '⏰ Starting actual message counts sync from Redis to MySQL',
    );

    try {
      const redisCounts =
        await this.redisRepository.getAllActualMessageCounts();
      let updatedCount = 0;

      for (const [redisKey, messageCount] of Object.entries(redisCounts)) {
        // Extract chat_id from redis key (format: "chat:1:message_count_actual")
        const parts = redisKey.split(':');
        const chat_id = parseInt(parts[1], 10);
        const count = parseInt(messageCount, 10);

        // Skip records where message_count is 0
        if (count === 0 || isNaN(chat_id)) {
          continue;
        }

        try {
          await this.chatRepository.updateMessageCount(chat_id, count);
          updatedCount++;
          this.logger.log(
            `✅ Updated chat ${chat_id} with message_count: ${count}`,
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to update chat ${chat_id}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `⏰ Actual message counts sync completed: ${updatedCount} records updated`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error syncing actual message counts: ${error.message}`,
        error.stack,
      );
    }
  }
}
