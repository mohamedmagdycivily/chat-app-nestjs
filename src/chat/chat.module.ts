import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import MainRepositories from './storage/main/main.repositories';
import { MainConnection } from './storage/main/main.connection';
import { MessagingModule } from './messaging/messaging.module';
import { RedisModule } from './storage/redis/redis.module';

// Controllers
import { AppController } from './controllers/app.controller';
import { ChatController as ChatsController } from './controllers/chat.controller';
import { MessageController } from './controllers/message.controller';

// Services
import { AppService } from './services/app.service';
import { ChatService } from './services/chat.service';
import { MessageService } from './services/message.service';
import { CronService } from './services/cron.service';

// Processors
import { EventHandlers } from './events/handlers';

@Module({
  imports: [
    MessagingModule,
    MainRepositories,
    MainConnection,
    RedisModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController, ChatsController, MessageController],
  providers: [
    AppService,
    ChatService,
    MessageService,
    CronService,
    ...EventHandlers,
  ],
})
export class ChatModule {}
