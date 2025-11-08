import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Chat } from '../models/chat.model';
import { Message } from '../models/message.model';
import { Transaction } from 'sequelize';

@Injectable()
export class ChatRepository {
  constructor(
    @InjectModel(Chat, 'main')
    private readonly chatModel: typeof Chat,
  ) {}

  async create(
    data: { app_id: number; chat_number: number },
    transaction?: Transaction,
  ): Promise<Chat> {
    return this.chatModel.create(data, { transaction });
  }

  async findByAppIdAndChatNumber(
    app_id: number,
    chat_number: number,
  ): Promise<Chat | null> {
    return this.chatModel.findOne({
      where: { app_id, chat_number },
    });
  }

  async findByAppIdAndChatNumberWithMessages(
    app_id: number,
    chat_number: number,
  ): Promise<Chat | null> {
    return this.chatModel.findOne({
      where: { app_id, chat_number },
      include: [Message],
    });
  }

  async findAllByAppId(app_id: number): Promise<Chat[]> {
    return this.chatModel.findAll({
      where: { app_id },
      attributes: ['chat_number'],
    });
  }

  async updateMessageCount(id: number, message_count: number): Promise<void> {
    await this.chatModel.update(
      { message_count },
      {
        where: { id },
      },
    );
  }

  async findByAppIdAndChatNumberBulk(
    app_id: number,
    chat_number: number,
  ): Promise<Chat | null> {
    return this.chatModel.findOne({
      where: { app_id, chat_number },
    });
  }
}
