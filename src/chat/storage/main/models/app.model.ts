import {
  Table,
  Column,
  Model,
  DataType,
  CreatedAt,
  UpdatedAt,
  HasMany,
  BeforeValidate,
} from 'sequelize-typescript';
import { Chat } from './chat.model';

@Table({
  tableName: 'apps',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['token'],
      name: 'index_apps_on_token',
    },
  ],
})
export class App extends Model {
  @Column({
    type: DataType.BIGINT,
    allowNull: false,
    unique: true,
  })
  token: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    defaultValue: 0,
  })
  chat_count: number;

  @CreatedAt
  created_at: Date;

  @UpdatedAt
  updated_at: Date;

  @HasMany(() => Chat)
  chats: Chat[];

  // Generate unique token before validation
  @BeforeValidate
  static generateToken(instance: App) {
    if (!instance.token) {
      instance.token = App.generateUniqueTokenValue();
    }
  }

  // Helper method to generate token
  static generateUniqueTokenValue(): number {
    const length = Math.floor(Math.random() * 5) + 6; // Random length between 6-10
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Instance method to get Redis key
  getRedisKey(): string {
    return `a_t_${this.token}`;
  }
}
