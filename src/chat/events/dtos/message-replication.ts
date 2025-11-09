import {
  IsDate,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EventDto } from '../../interfaces/event';

export class MessageReplicationDataDto {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsInt()
  message_number: number;

  @IsInt()
  chat_id: number;

  @IsString()
  content: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsOptional()
  updated_at?: Date;
}

export class MessageReplicationEventDataDto {
  @ValidateNested()
  @IsObject({ message: 'Message must be an object' })
  @Type(() => MessageReplicationDataDto)
  message: MessageReplicationDataDto;

  @IsNumber()
  @IsOptional()
  messageId?: number;
}

export class MessageReplicationEventDto extends EventDto {
  @ValidateNested()
  @IsObject({ message: 'Event data must be an object' })
  @Type(() => MessageReplicationEventDataDto)
  data: MessageReplicationEventDataDto;
}
