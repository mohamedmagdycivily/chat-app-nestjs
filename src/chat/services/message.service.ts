import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageRepository } from '../storage/main/repositories/message.repository';
import { ChatRepository } from '../storage/main/repositories/chat.repository';
import { AppRepository } from '../storage/main/repositories/app.repository';
import { RedisRepository } from '../storage/redis/redis.repository';
import { OutboxRepository } from '../storage/main/repositories/outbox.repository';
import { CreateMessageDto } from '../dtos/create-message.dto';
import { Message } from '../storage/main/models/message.model';
import { generateUUID } from 'src/common/utils.helper';
import { messageEvents } from 'src/common/messaging.config';

@Injectable()
export class MessageService {
  constructor(
    private readonly messageRepository: MessageRepository,
    private readonly chatRepository: ChatRepository,
    private readonly appRepository: AppRepository,
    private readonly redisRepository: RedisRepository,
    private readonly outboxRepository: OutboxRepository,
  ) {}

  async create(
    token: number,
    chat_number: number,
    createMessageDto: CreateMessageDto,
  ): Promise<{ message_number: number }> {
    // Find the app
    const app = await this.appRepository.findByToken(token);
    if (!app) {
      throw new NotFoundException('Application not found');
    }

    // Find the chat
    const chat = await this.chatRepository.findByAppIdAndChatNumber(
      app.id,
      chat_number,
    );

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // 🚀 Step 1: Get Unique Number from Redis (INCR chat:{chat_id}:message_number_generator)
    const message_number = await this.redisRepository.getNextMessageNumber(
      chat.id,
    );

    // 🚀 Step 2: Write to Outbox (single, fast, transactional write)
    const eventId = generateUUID();
    await this.outboxRepository.createOutboxEvent({
      eventId,
      eventType: messageEvents.CreateMessageEvent,
      aggregateId: `${chat.id}-${message_number}`,
      timestamp: new Date(),
      routingKey: messageEvents.CreateMessageEvent,
      exchange: process.env.MESSAGE_EXCHANGE,
      data: {
        message: {
          message_number,
          chat_id: chat.id,
          content: createMessageDto.content,
        },
        messageId: eventId, // Include for idempotency
      },
    });

    // 🚀 Step 3: Return 202 Accepted immediately
    return { message_number };
  }

  async findAll(
    token: number,
    chat_number: number,
  ): Promise<Array<{ message_number: number; content: string }>> {
    const app = await this.appRepository.findByToken(token);
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

    const messages = await this.messageRepository.findByChatId(chat.id);
    return messages.map((msg) => ({
      message_number: msg.message_number,
      content: msg.content,
    }));
  }

  async findOne(
    token: number,
    chat_number: number,
    message_number: number,
  ): Promise<Message> {
    const app = await this.appRepository.findByToken(token);
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

    const message = await this.messageRepository.findByChatIdAndMessageNumber(
      chat.id,
      message_number,
    );

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }
}
