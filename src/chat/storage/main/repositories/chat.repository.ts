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
    attributes?: string[],
  ): Promise<Chat | null> {
    return this.chatModel.findOne({
      where: { app_id, chat_number },
      attributes,
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

  async bulkUpdateMessageCounts(
    updates: Array<{ id: number; message_count: number }>,
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }

    // Build CASE statement with parameterized values
    const caseStatements = updates
      .map((u, index) => `WHEN :id${index} THEN :count${index}`)
      .join(' ');

    const ids = updates.map((u) => u.id);
    const idsPlaceholders = ids.map((_, index) => `:inId${index}`).join(',');

    const query = `
      UPDATE chats 
      SET message_count = CASE id
        ${caseStatements}
      END
      WHERE id IN (${idsPlaceholders})
    `;

    // Build replacements object
    const replacements: Record<string, number> = {};
    updates.forEach((u, index) => {
      replacements[`id${index}`] = u.id;
      replacements[`count${index}`] = u.message_count;
      replacements[`inId${index}`] = u.id;
    });

    await this.chatModel.sequelize.query(query, {
      replacements,
    });
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
