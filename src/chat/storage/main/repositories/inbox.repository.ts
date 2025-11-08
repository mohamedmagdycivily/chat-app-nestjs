import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { InboxModel } from '../models/inbox.model';
import { Transaction } from 'sequelize';

@Injectable()
export class InboxRepository {
  constructor(
    @InjectModel(InboxModel, 'main')
    private inboxModel: typeof InboxModel,
  ) {}

  async validateEvent(
    eventId: string,
    eventCount: number,
    transaction?: Transaction,
  ): Promise<boolean> {
    try {
      await this.inboxModel.create(
        {
          eventId,
          eventCount,
        },
        { transaction },
      );
      return true;
    } catch (error) {
      if (error.parent?.code === '23505') {
        // unique_violation
        return false;
      }
      throw error;
    }
  }
}
