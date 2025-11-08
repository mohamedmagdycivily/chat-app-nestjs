import { DataTypes } from 'sequelize';
import type { Migration } from '../umzug';

export const up: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('messages', {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    message_number: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    chat_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: 'chats',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
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

  // Add index on chat_id
  await sequelize.getQueryInterface().addIndex('messages', ['chat_id'], {
    name: 'index_messages_on_chat_id',
  });
};

export const down: Migration = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('messages');
};
