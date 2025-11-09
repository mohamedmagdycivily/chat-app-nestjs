import { DataTypes } from 'sequelize';
import type { Migration } from '../umzug';

export const up: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('chats', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    chat_number: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    message_count: {
      type: DataTypes.BIGINT,
      allowNull: false,
      defaultValue: 0,
    },
    app_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'apps',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });

  // Add composite index on app_id, chat_number, and id
  await sequelize
    .getQueryInterface()
    .addIndex('chats', ['app_id', 'chat_number', 'id'], {
      name: 'index_chats_on_app_id_and_chat_number_and_id',
    });
};

export const down: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('chats');
};
