import {
  IsDate,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { EventDto } from '../../interfaces/event';

export class ContactReplicationDataDto {
  @IsInt()
  id: number;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail(
    {},
    {
      message: 'Invalid email format',
    },
  )
  email?: string;

  @IsInt()
  makerId: number;

  @IsInt()
  version: number;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  createdAt: Date;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  updatedAt: Date;

  @IsOptional()
  @Transform(({ value }) => (value !== null ? new Date(value) : value))
  @IsDate()
  deletedAt?: Date;
}

export class ContactReplicationEventDataDto {
  @ValidateNested()
  @IsObject({ message: 'Contact must be an object' })
  @Type(() => ContactReplicationDataDto)
  contact: ContactReplicationDataDto;
}

export class ContactReplicationEventDto extends EventDto {
  @ValidateNested()
  @IsObject({ message: 'Event data must be an object' })
  @Type(() => ContactReplicationEventDataDto)
  data: ContactReplicationEventDataDto;
}
