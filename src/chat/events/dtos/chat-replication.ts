import {
  IsDate,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EventDto } from '../../interfaces/event';

export class ChatReplicationDataDto {
  @IsInt()
  @IsOptional()
  id?: number;

  @IsInt()
  chat_number: number;

  @IsInt()
  @IsOptional()
  message_count?: number;

  @IsInt()
  app_id: number;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsOptional()
  created_at?: Date;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  @IsOptional()
  updated_at?: Date;
}

export class ChatReplicationEventDataDto {
  @ValidateNested()
  @IsObject({ message: 'Chat must be an object' })
  @Type(() => ChatReplicationDataDto)
  chat: ChatReplicationDataDto;

  @IsString()
  @IsOptional()
  messageId?: string;
}

export class ChatReplicationEventDto extends EventDto {
  @ValidateNested()
  @IsObject({ message: 'Event data must be an object' })
  @Type(() => ChatReplicationEventDataDto)
  data: ChatReplicationEventDataDto;
}
