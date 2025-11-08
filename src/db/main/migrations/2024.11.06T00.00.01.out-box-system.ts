import type { Migration } from '../umzug';
import { DataTypes } from 'sequelize';

export const up: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.createTable(
    'outbox',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },

      event_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      event_type: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      aggregate_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      data: {
        type: DataTypes.JSON,
        allowNull: false,
      },

      exchange: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      routing_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal(
          'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
        ),
      },
    },
    {
      charset: 'utf8',
      collate: 'utf8_unicode_ci',
    },
  );
};

export const down: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.dropTable('outbox');
};
