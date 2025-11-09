import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { App } from '../models/app.model';
import { Chat } from '../models/chat.model';

@Injectable()
export class AppRepository {
  constructor(
    @InjectModel(App, 'main')
    private readonly appModel: typeof App,
  ) {}

  async create(data: { name: string; token?: number }): Promise<App> {
    return this.appModel.create(data);
  }

  async findAll(): Promise<App[]> {
    return this.appModel.findAll({
      attributes: ['token', 'name', 'chat_count'],
    });
  }

  async findByToken(token: number, attributes?: string[]): Promise<App | null> {
    return this.appModel.findOne({
      where: { token },
      attributes,
    });
  }

  // async findByTokenWithChats(token: number): Promise<App | null> {
  //   return this.appModel.findOne({
  //     where: { token },
  //     include: [Chat],
  //   });
  // }

  async update(id: number, data: Partial<App>): Promise<[number, App[]]> {
    return this.appModel.update(data, {
      where: { id },
      returning: true,
    });
  }

  async updateChatCount(id: number, chat_count: number): Promise<void> {
    await this.appModel.update(
      { chat_count },
      {
        where: { id },
      },
    );
  }

  async bulkUpdateChatCounts(
    updates: Array<{ id: number; chat_count: number }>,
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
      UPDATE apps 
      SET chat_count = CASE id
        ${caseStatements}
      END
      WHERE id IN (${idsPlaceholders})
    `;

    // Build replacements object
    const replacements: Record<string, number> = {};
    updates.forEach((u, index) => {
      replacements[`id${index}`] = u.id;
      replacements[`count${index}`] = u.chat_count;
      replacements[`inId${index}`] = u.id;
    });

    await this.appModel.sequelize.query(query, {
      replacements,
    });
  }

  async exists(token: number): Promise<boolean> {
    const count = await this.appModel.count({
      where: { token },
    });
    return count > 0;
  }
}
