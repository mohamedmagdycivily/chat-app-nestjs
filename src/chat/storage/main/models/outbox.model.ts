import {
  Column,
  Model,
  PrimaryKey,
  Table,
  DataType,
  AutoIncrement,
} from 'sequelize-typescript';

@Table({
  tableName: 'outbox',
  timestamps: true,
  paranoid: false,
  underscored: true,
  omitNull: true,
  version: false,
})
export class OutboxModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  eventId: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  eventType: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  aggregateId: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  timestamp: Date;

  @Column({
    type: DataType.STRING(255),
    allowNull: true,
  })
  traceparent: string;

  @Column({
    type: DataType.JSONB,
    allowNull: false,
  })
  data: Record<string, any>;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  exchange: string;

  @Column({
    type: DataType.STRING(255),
    allowNull: false,
  })
  routingKey: string;
}
