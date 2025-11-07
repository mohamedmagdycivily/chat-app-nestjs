import { Module } from '@nestjs/common';
import MainRepositories from './storage/main/main.repositories';
import { ChatController } from './chat.controller';
import { MainConnection } from './storage/main/main.connection';
import { MessagingModule } from './messaging/messaging.module';
@Module({
  imports: [MessagingModule, MainRepositories, MainConnection],
  controllers: [ChatController],
  providers: [],
})
export class ChatModule {}
