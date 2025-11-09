import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Message } from '../models/message.model';
import { Transaction } from 'sequelize';

@Injectable()
export class MessageRepository {
  constructor(
    @InjectModel(Message, 'main')
    private readonly messageModel: typeof Message,
  ) {}

  async create(
    data: {
      chat_id: number;
      message_number: number;
      content: string;
    },
    transaction?: Transaction,
  ): Promise<Message> {
    return this.messageModel.create(data, { transaction });
  }

  async findByChatId(
    chat_id: number,
    attributes?: string[],
  ): Promise<Message[]> {
    return this.messageModel.findAll({
      where: { chat_id },
      attributes,
    });
  }

  async findByChatIdAndMessageNumber(
    chat_id: number,
    message_number: number,
  ): Promise<Message | null> {
    return this.messageModel.findOne({
      where: { chat_id, message_number },
      attributes: ['message_number', 'content'],
    });
  }
}
