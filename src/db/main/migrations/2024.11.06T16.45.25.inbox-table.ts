import type { Migration } from '../umzug';
import { DataTypes } from 'sequelize';

export const up: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable(
    'inbox',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      event_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      event_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

  // Alter event_id column to be UNSIGNED BIGINT
  await queryInterface.sequelize.query(
    'ALTER TABLE `inbox` MODIFY COLUMN `event_id` BIGINT UNSIGNED NOT NULL',
  );

  await queryInterface.addIndex('inbox', ['event_id'], {
    unique: true,
    name: 'inbox_event_id_unique',
  });
};

export const down: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  return queryInterface.dropTable('inbox');
};
