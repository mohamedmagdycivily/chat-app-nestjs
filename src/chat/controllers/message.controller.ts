import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MessageService } from '../services/message.service';
import { CreateMessageDto } from '../dtos/create-message.dto';

@ApiTags('Messages')
@Controller('api/v1/apps/:token/chats/:chat_number/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new message' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiParam({ name: 'chat_number', description: 'Chat number' })
  @ApiResponse({
    status: 202,
    description: 'Message creation accepted (processing asynchronously)',
  })
  @ApiResponse({ status: 404, description: 'Chat or Application not found' })
  async create(
    @Param('token', ParseIntPipe) token: number,
    @Param('chat_number', ParseIntPipe) chat_number: number,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.messageService.create(token, chat_number, createMessageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages for a chat' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiParam({ name: 'chat_number', description: 'Chat number' })
  @ApiResponse({ status: 200, description: 'List of all messages' })
  @ApiResponse({ status: 404, description: 'Chat or Application not found' })
  async findAll(
    @Param('token', ParseIntPipe) token: number,
    @Param('chat_number', ParseIntPipe) chat_number: number,
  ) {
    return this.messageService.findAll(token, chat_number);
  }

  @Get(':message_number')
  @ApiOperation({ summary: 'Get a specific message' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiParam({ name: 'chat_number', description: 'Chat number' })
  @ApiParam({ name: 'message_number', description: 'Message number' })
  @ApiResponse({ status: 200, description: 'Message found' })
  @ApiResponse({
    status: 404,
    description: 'Message, Chat, or Application not found',
  })
  async findOne(
    @Param('token', ParseIntPipe) token: number,
    @Param('chat_number', ParseIntPipe) chat_number: number,
    @Param('message_number', ParseIntPipe) message_number: number,
  ) {
    const message = await this.messageService.findOne(
      token,
      chat_number,
      message_number,
    );
    return {
      message_number: message.message_number,
      content: message.content,
    };
  }
}
