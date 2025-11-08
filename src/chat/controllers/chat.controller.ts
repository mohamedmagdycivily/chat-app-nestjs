import { Controller, Get, Post, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ChatService } from '../services/chat.service';

@ApiTags('Chats')
@Controller('api/v1/apps/:token/chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new chat' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiResponse({
    status: 202,
    description: 'Chat creation accepted (processing asynchronously)',
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async create(@Param('token', ParseIntPipe) token: number) {
    return this.chatService.create(token);
  }

  @Get()
  @ApiOperation({ summary: 'Get all chats for an application' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiResponse({ status: 200, description: 'List of all chats' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findAll(@Param('token', ParseIntPipe) token: number) {
    return this.chatService.findAll(token);
  }

  @Get(':chat_number')
  @ApiOperation({ summary: 'Get a specific chat' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiParam({ name: 'chat_number', description: 'Chat number' })
  @ApiResponse({ status: 200, description: 'Chat found' })
  @ApiResponse({ status: 404, description: 'Chat or Application not found' })
  async findOne(
    @Param('token', ParseIntPipe) token: number,
    @Param('chat_number', ParseIntPipe) chat_number: number,
  ) {
    const chat = await this.chatService.findOne(token, chat_number);
    return {
      chat_number: chat.chat_number,
    };
  }
}
