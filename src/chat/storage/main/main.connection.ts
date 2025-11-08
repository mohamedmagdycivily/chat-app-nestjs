import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MainModels } from './models';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      name: 'main',
      useFactory: () => ({
        dialect: 'mysql',
        host: process.env.MAIN_DB_HOST,
        port: Number(process.env.MAIN_DB_PORT),

        username: process.env.MAIN_DB_USERNAME,
        password: process.env.MAIN_DB_PASSWORD,
        database: process.env.MAIN_DB_DATABASE,

        logging: process.env.NODE_ENV !== 'production' ? console.log : false,
        sync: {
          force: false,
        },
        models: MainModels,
        autoLoadModels: false,
        synchronize: false,
      }),
    }),
  ],
})
export class MainConnection {}
