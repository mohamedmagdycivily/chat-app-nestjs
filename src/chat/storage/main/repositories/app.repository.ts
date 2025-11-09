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

  async exists(token: number): Promise<boolean> {
    const count = await this.appModel.count({
      where: { token },
    });
    return count > 0;
  }
}
