import { Injectable, NotFoundException } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { ChatRepository } from '../storage/main/repositories/chat.repository';
import { AppRepository } from '../storage/main/repositories/app.repository';
import { RedisRepository } from '../storage/redis/redis.repository';
import { Chat } from '../storage/main/models/chat.model';
import { generateUniqueEventId } from 'src/common/utils.helper';
import { chatEvents } from 'src/common/messaging.config';

@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
    private readonly appRepository: AppRepository,
    private readonly redisRepository: RedisRepository,
    private readonly amqpConnection: AmqpConnection,
  ) {}

  async create(token: number): Promise<{ chat_number: number }> {
    // Find the app
    const app = await this.appRepository.findByToken(token, ['id']);
    if (!app) {
      throw new NotFoundException('Application not found');
    }

    // 🚀 Step 1: Get Unique Number from Redis (INCR app:{id}:chat_number_generator)
    const chat_number = await this.redisRepository.getNextChatNumber(app.id);

    // Initialize the chat in Redis for message counting
    await this.redisRepository.initializeChat(app.id, chat_number);

    // 🚀 Step 2: Send message directly to exchange
    const eventId = generateUniqueEventId();
    const eventPayload = {
      eventId,
      eventType: chatEvents.CreateChatEvent,
      aggregateId: `${app.id}-${chat_number}`,
      timestamp: new Date(),
      data: {
        chat: {
          chat_number,
          app_id: app.id,
        },
        messageId: eventId, // Include for idempotency
      },
    };

    await this.amqpConnection.publish(
      process.env.CHAT_EXCHANGE,
      chatEvents.CreateChatEvent,
      eventPayload,
      {
        persistent: true,
        contentType: 'application/json',
      },
    );

    // 🚀 Step 3: Return 202 Accepted immediately
    return { chat_number };
  }

  async findAll(
    token: number,
  ): Promise<{ chats: Array<{ chat_number: number }> }> {
    const app = await this.appRepository.findByToken(token, ['id']);
    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const chats = await this.chatRepository.findAllByAppId(app.id);
    return {
      chats: chats.map((chat) => ({ chat_number: chat.chat_number })),
    };
  }

  async findOne(token: number, chat_number: number): Promise<Chat> {
    const app = await this.appRepository.findByToken(token, ['id']);
    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const chat = await this.chatRepository.findByAppIdAndChatNumber(
      app.id,
      chat_number,
    );

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    return chat;
  }
}
