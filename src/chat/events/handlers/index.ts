import { ChatReplicationEventHandler } from './chat-replication.handler';
import { MessageReplicationEventHandler } from './message-replication.handler';
import { OutboxTransformerProcessor } from './outbox-transformer.processor.handler';

export const EventHandlers = [
  ChatReplicationEventHandler,
  MessageReplicationEventHandler,
  // OutboxTransformerProcessor,
];
