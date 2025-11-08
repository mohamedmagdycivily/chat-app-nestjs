import { AppRepository } from './app.repository';
import { ChatRepository } from './chat.repository';
import { MessageRepository } from './message.repository';
import { OutboxRepository } from './outbox.repository';
import { InboxRepository } from './inbox.repository';

export const MainRepos = [
  AppRepository,
  ChatRepository,
  MessageRepository,
  OutboxRepository,
  InboxRepository,
];
