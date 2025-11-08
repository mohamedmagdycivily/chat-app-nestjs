import { Event, IEvent } from '../../interfaces/event';
import { MessageReplicationEventDataDto } from '../dtos/message-replication';

export class MessageReplicationEvent extends Event<MessageReplicationEventDataDto> {
  constructor({
    eventId,
    eventType,
    aggregateId,
    timestamp,
    data,
  }: IEvent<MessageReplicationEventDataDto>) {
    super({
      eventId,
      eventType,
      aggregateId,
      timestamp,
      data,
    });
  }
}
