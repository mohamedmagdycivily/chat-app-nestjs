import { Event, IEvent } from '../../interfaces/event';
import { ChatReplicationEventDataDto } from '../dtos/chat-replication';

export class ChatReplicationEvent extends Event<ChatReplicationEventDataDto> {
  constructor({
    eventId,
    eventType,
    aggregateId,
    timestamp,
    data,
  }: IEvent<ChatReplicationEventDataDto>) {
    super({
      eventId,
      eventType,
      aggregateId,
      timestamp,
      data,
    });
  }
}
