import {
  Column,
  Model,
  PrimaryKey,
  Table,
  Default,
  AutoIncrement,
  AllowNull,
  Unique,
  // DataType,
  HasMany,
  DataType,
} from 'sequelize-typescript';
import { ENUM } from 'sequelize';

@Table({
  tableName: 'user',
  timestamps: true,
  paranoid: true,
  underscored: true,
  omitNull: true,
  indexes: [
    {
      fields: ['phone'],
    },
    {
      fields: ['national_id'],
    },
    {
      fields: ['id', 'deleted_at'],
    },
  ],
  version: true,
})
export class UserModel extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;
}
