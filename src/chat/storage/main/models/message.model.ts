import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { Chat } from './chat.model';

@Table({
  tableName: 'messages',
  timestamps: true,
})
export class Message extends Model {
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  message_number: number;

  @ForeignKey(() => Chat)
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
  })
  chat_id: number;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content: string;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @BelongsTo(() => Chat)
  chat: Chat;
}
