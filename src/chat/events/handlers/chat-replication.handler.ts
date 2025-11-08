import { Injectable, Logger } from '@nestjs/common';
import { ChatReplicationEvent } from '../impl/chat-replication';
import { ChatReplicationEventDto } from '../dtos/chat-replication';
import { ChatRepository } from '../../storage/main/repositories/chat.repository';
import { RabbitPayload, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { chatEvents, chatReplicationEvents } from 'src/common/messaging.config';
import { createRabbitErrorHandler } from 'src/common/utils.helper';
import { InboxRepository } from '../../storage/main/repositories/inbox.repository';
import { RedisRepository } from '../../storage/redis/redis.repository';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class ChatReplicationEventHandler {
  private readonly logger = new Logger(ChatReplicationEventHandler.name);

  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly inboxRepository: InboxRepository,
    private readonly redisRepository: RedisRepository,
    @InjectConnection('main')
    private readonly sequelize: Sequelize,
  ) {}

  @RabbitSubscribe({
    queue: `q.${process.env.MODULE_NAME}.${ChatReplicationEvent.name}`,
    exchange: process.env.CHAT_EXCHANGE,
    routingKey: chatReplicationEvents.map((event) => event.routingKey),
    queueOptions: {
      deadLetterExchange: `x.dlx.${process.env.MODULE_NAME}`,
      arguments: {
        'x-queue-type': 'quorum',
      },
    },
    errorHandler: createRabbitErrorHandler(
      `${ChatReplicationEvent.name}Handler`,
    ),
  })
  async handle(@RabbitPayload() eventData: ChatReplicationEventDto) {
    this.logger.log(
      `🎧 Received event: ${eventData.eventType} (${eventData.eventId})`,
    );

    if (eventData.eventType === chatEvents.CreateChatEvent) {
      await this.handleCreateChatEvent(eventData);
    }

    return;
  }

  /**
   * 🎧 Listener Service - Handle CreateChatEvent
   *
   * Phase 1: Database Write (Idempotent)
   * Phase 2: Redis Counter (Idempotent & Atomic using Lua script)
   */
  private async handleCreateChatEvent(eventData: ChatReplicationEventDto) {
    const messageId = eventData.data.messageId || eventData.eventId;
    const { app_id, chat_number } = eventData.data.chat;

    try {
      // --- Phase 1: Database Work (Idempotent) ---
      this.logger.log(
        `🌟 🌟 🌟 🌟 🌟 Phase 1: Checking inbox for message ${messageId}`,
      );

      const isNewMessage = await this.inboxRepository.validateEvent(
        messageId,
        1, // eventCount
      );

      if (isNewMessage) {
        // Message is new, create the chat in the database
        this.logger.log(
          `✅ New message detected. Creating chat ${chat_number} for app ${app_id}`,
        );

        await this.sequelize.transaction(async (transaction) => {
          await this.chatRepository.create(
            {
              app_id,
              chat_number,
            },
            transaction,
          );
        });

        this.logger.log(
          `🌟 🌟 🌟 🌟 🌟 Phase 1 complete: Chat created in database`,
        );
      } else {
        this.logger.log(
          `🌟 🌟 🌟 🌟 🌟 Duplicate message ${messageId}. Skipping database write.`,
        );
      }

      // --- Phase 2: Redis Counter (Atomic & Idempotent) ---
      this.logger.log(
        `🌟 🌟 🌟 🌟 🌟 Phase 2: Running atomic Lua script for counter`,
      );

      const result = await this.redisRepository.atomicLockAndIncrementChatCount(
        messageId,
        app_id,
      );

      if (result === 1) {
        this.logger.log(
          `✅ Phase 2 complete: Counter incremented for app ${app_id}`,
        );
      } else {
        this.logger.log(
          `⚠️ Duplicate processing for counter. Lock already exists.`,
        );
      }

      this.logger.log(
        `🎉 Successfully processed CreateChatEvent for chat ${chat_number}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error processing CreateChatEvent: ${error.message}`,
        error.stack,
      );
      // Throw error to trigger NACK and retry
      throw error;
    }
  }
}
