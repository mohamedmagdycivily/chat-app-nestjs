import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OutboxModel } from '../models/outbox.model';
import { Transaction } from 'sequelize';

@Injectable()
export class OutboxRepository {
  constructor(
    @InjectModel(OutboxModel, 'main')
    private outboxModel: typeof OutboxModel,
  ) {}

  async createOutboxEvent(
    eventData: Partial<OutboxModel>,
    transaction?: Transaction,
  ): Promise<OutboxModel> {
    return this.outboxModel.create(eventData, {
      transaction,
    });
  }

  async bulkCreateOutboxEvents(
    eventData: Partial<OutboxModel>[],
    transaction?: Transaction,
  ): Promise<OutboxModel[]> {
    return this.outboxModel.bulkCreate(eventData, {
      transaction,
    });
  }
}
