import {
  Column,
  Model,
  PrimaryKey,
  Table,
  AutoIncrement,
  AllowNull,
} from 'sequelize-typescript';

@Table({
  tableName: 'inbox',
  timestamps: true,
  underscored: true,
  omitNull: true,
})
export class InboxModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  eventId: string;

  @AllowNull(false)
  @Column({
    defaultValue: 0,
  })
  eventCount: number;
}
