import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAppDto {
  @ApiProperty({
    description: 'The name of the application',
    example: 'Updated Chat App',
  })
  @IsNotEmpty()
  @IsString()
  name: string;
}
