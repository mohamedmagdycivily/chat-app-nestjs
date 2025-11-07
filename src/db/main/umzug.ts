import { config } from 'dotenv';

if (process.env.NODE_ENV === 'production') {
  config({ path: '/vault/secrets/db-config' });
  config({ path: '/vault/secrets/mq-config' });
} else {
  config({ path: '.env' });
}

import { Umzug, SequelizeStorage } from 'umzug';
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.MAIN_DB_HOST,
  port: Number(process.env.MAIN_DB_PORT),

  username: process.env.MAIN_DB_USERNAME,
  password: process.env.MAIN_DB_PASSWORD,
  database: process.env.MAIN_DB_DATABASE,
  pool: {
    max: 1,
    min: 0,
  },
});

export const migrator = new Umzug({
  migrations: {
    glob: ['migrations/*.ts', { cwd: __dirname }],
  },
  context: sequelize,
  storage: new SequelizeStorage({
    sequelize,
  }),
  logger: console,
});

export type Migration = typeof migrator._types.migration;
