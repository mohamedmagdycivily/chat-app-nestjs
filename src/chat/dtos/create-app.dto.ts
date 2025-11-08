import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAppDto {
  @ApiProperty({
    description: 'The name of the application',
    example: 'My Chat App',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
