import type { Migration } from '../umzug';
import { DataTypes } from 'sequelize';

export const up: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable(
    'user',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
      },
      national_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      password: {
        type: DataTypes.BLOB,
        allowNull: true,
      },
      verification_status: {
        type: DataTypes.ENUM('UNVERIFIED', 'VERIFIED'),
        allowNull: false,
        defaultValue: 'UNVERIFIED',
      },
      version: {
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    },
  );

  // Add index on phone & NID columns --------------------------------
  await Promise.all([
    queryInterface.addIndex('user', ['id', 'deleted_at']),
    queryInterface.addIndex('user', ['phone']),
    queryInterface.addIndex('user', ['national_id']),
  ]);
};

export const down: Migration = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  return queryInterface.dropTable('user');
};
