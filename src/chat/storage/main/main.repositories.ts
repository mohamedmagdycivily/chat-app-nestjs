import { Module } from '@nestjs/common';
import { UserModel } from './models/user.model';
import { SequelizeModule } from '@nestjs/sequelize';
import { MainRepos } from './repositories';

@Module({
  imports: [SequelizeModule.forFeature([UserModel], 'main')],
  providers: [...MainRepos],
  exports: [...MainRepos],
})
export default class MainRepositories {}
