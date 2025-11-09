import { Transform } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString } from 'class-validator';
export class EventDto {
  @IsInt()
  eventId: number;

  @IsString()
  eventType: string;

  @IsString()
  aggregateId: string;

  @IsString()
  @IsOptional()
  traceparent?: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  timestamp: Date;
}

export interface IEvent<T> {
  eventId: number;
  eventType: string;
  aggregateId: string;
  traceparent?: string;
  timestamp: Date;
  data: T;
}

export class Event<T> implements IEvent<T> {
  public readonly eventId: number;
  public readonly eventType: string;
  public readonly aggregateId: string;
  public readonly traceparent?: string;
  public readonly timestamp: Date;
  public readonly data: T;

  constructor({
    eventId,
    eventType,
    aggregateId,
    traceparent,
    timestamp,
    data,
  }: IEvent<T>) {
    this.eventId = eventId;
    this.eventType = eventType;
    this.aggregateId = aggregateId;
    this.traceparent = traceparent;
    this.timestamp = timestamp;
    this.data = data;
  }
}
