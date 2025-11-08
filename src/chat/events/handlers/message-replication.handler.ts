import { Injectable, Logger } from '@nestjs/common';
import { MessageReplicationEvent } from '../impl/message-replication';
import { MessageReplicationEventDto } from '../dtos/message-replication';
import { MessageRepository } from '../../storage/main/repositories/message.repository';
import { RabbitPayload, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import {
  messageEvents,
  messageReplicationEvents,
} from 'src/common/messaging.config';
import { createRabbitErrorHandler } from 'src/common/utils.helper';
import { InboxRepository } from '../../storage/main/repositories/inbox.repository';
import { RedisRepository } from '../../storage/redis/redis.repository';
import { InjectConnection } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class MessageReplicationEventHandler {
  private readonly logger = new Logger(MessageReplicationEventHandler.name);

  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly inboxRepository: InboxRepository,
    private readonly redisRepository: RedisRepository,
    @InjectConnection('main')
    private readonly sequelize: Sequelize,
  ) {}

  @RabbitSubscribe({
    queue: `q.${process.env.MODULE_NAME}.${MessageReplicationEvent.name}`,
    exchange: process.env.MESSAGE_EXCHANGE,
    routingKey: messageReplicationEvents.map((event) => event.routingKey),
    queueOptions: {
      deadLetterExchange: `x.dlx.${process.env.MODULE_NAME}`,
      arguments: {
        'x-queue-type': 'quorum',
      },
    },
    errorHandler: createRabbitErrorHandler(
      `${MessageReplicationEvent.name}Handler`,
    ),
  })
  async handle(@RabbitPayload() eventData: MessageReplicationEventDto) {
    this.logger.log(
      `🎧 Received event: ${eventData.eventType} (${eventData.eventId})`,
    );

    if (eventData.eventType === messageEvents.CreateMessageEvent) {
      await this.handleCreateMessageEvent(eventData);
    }

    return;
  }

  /**
   * 🎧 Listener Service - Handle CreateMessageEvent
   *
   * Phase 1: Database Write (Idempotent)
   * Phase 2: Redis Counter (Idempotent & Atomic using Lua script)
   */
  private async handleCreateMessageEvent(
    eventData: MessageReplicationEventDto,
  ) {
    const messageId = eventData.data.messageId || eventData.eventId;
    const { chat_id, message_number, content } = eventData.data.message;

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
        // Message is new, create the message in the database
        this.logger.log(
          `✅ New message detected. Creating message ${message_number} for chat ${chat_id}`,
        );

        await this.sequelize.transaction(async (transaction) => {
          await this.messageRepository.create(
            {
              chat_id,
              message_number,
              content,
            },
            transaction,
          );
        });

        this.logger.log(
          `🌟 🌟 🌟 🌟 🌟 Phase 1 complete: Message created in database`,
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

      const result =
        await this.redisRepository.atomicLockAndIncrementMessageCount(
          messageId,
          chat_id,
        );

      if (result === 1) {
        this.logger.log(
          `✅ Phase 2 complete: Counter incremented for chat ${chat_id}`,
        );
      } else {
        this.logger.log(
          `⚠️ Duplicate processing for counter. Lock already exists.`,
        );
      }

      this.logger.log(
        `🎉 Successfully processed CreateMessageEvent for message ${message_number}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error processing CreateMessageEvent: ${error.message}`,
        error.stack,
      );
      // Throw error to trigger NACK and retry
      throw error;
    }
  }
}
