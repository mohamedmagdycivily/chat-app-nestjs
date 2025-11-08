import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { App } from './app.model';
import { Message } from './message.model';

@Table({
  tableName: 'chats',
  timestamps: true,
})
export class Chat extends Model {
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  chat_number: number;

  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    defaultValue: 0,
  })
  message_count: number;

  @ForeignKey(() => App)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  app_id: number;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @BelongsTo(() => App)
  app: App;

  @HasMany(() => Message)
  messages: Message[];

  // Instance method to get Redis key
  getRedisKey(): string {
    return `aid_${this.app_id}_cnum_${this.chat_number}`;
  }
}
