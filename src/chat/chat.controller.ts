import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StandardResponse } from 'src/common/standards/standard.response';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor() {}

  @ApiCreatedResponse({
    description: 'User Registered successfully.',
    type: StandardResponse<any>,
    example: {
      status: 'SUCCESS',
      message: 'User Registered successfully.',
      data: {
        user: {
          id: 1,
          name: 'Hossam Kamel',
          phone: '01021565165',
          nationalId: '12345678901234',
          verificationStatus: 'UNVERIFIED',
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'This user already exists!',
    type: StandardResponse,
  })
  @ApiBadRequestResponse({
    description: 'Invalid Inputs!',
    type: StandardResponse,
  })
  @ApiInternalServerErrorResponse({
    description: 'Internal Server Error!',
    type: StandardResponse,
  })
  @Post('register-user')
  async registerUser(@Body() userData: any): Promise<{
    message: string;
    user: any;
  }> {
    return {
      message: 'User Registered successfully.',
      user: userData,
    };
  }
}
