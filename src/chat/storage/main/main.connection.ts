import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { UserModel } from './models/user.model';
@Module({
  imports: [
    SequelizeModule.forRootAsync({
      name: 'main',
      useFactory: () => ({
        dialect: 'mysql',
        host: process.env.SYSTEM_DB_HOST,
        port: Number(process.env.SYSTEM_DB_PORT),

        username: process.env.SYSTEM_DB_USERNAME,
        password: process.env.SYSTEM_DB_PASSWORD,
        database: process.env.SYSTEM_DB_DATABASE,

        logging: process.env.NODE_ENV !== 'production' ? console.log : false,
        sync: {
          force: false,
        },
        models: [UserModel],
        autoLoadModels: false,
        synchronize: false,
      }),
    }),
  ],
})
export class MainConnection {}
