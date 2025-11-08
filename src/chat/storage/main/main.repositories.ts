import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { MainRepos } from './repositories';
import { MainModels } from './models';

@Module({
  imports: [SequelizeModule.forFeature(MainModels, 'main')],
  providers: [...MainRepos],
  exports: [...MainRepos],
})
export default class MainRepositories {}
