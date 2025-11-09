import {
  Column,
  Model,
  PrimaryKey,
  Table,
  AutoIncrement,
  AllowNull,
  DataType,
} from 'sequelize-typescript';

@Table({
  tableName: 'inbox',
  timestamps: true,
  underscored: true,
  omitNull: true,
  indexes: [
    {
      unique: true,
      fields: ['event_id'],
      name: 'inbox_event_id_unique',
    },
  ],
})
export class InboxModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column({
    type: DataType.BIGINT,
    unique: true,
  })
  eventId: number;

  @AllowNull(false)
  @Column({
    defaultValue: 0,
  })
  eventCount: number;
}
