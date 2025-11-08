import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AppService } from '../services/app.service';
import { CreateAppDto } from '../dtos/create-app.dto';
import { UpdateAppDto } from '../dtos/update-app.dto';

@ApiTags('Apps')
@Controller('api/v1/apps')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application' })
  @ApiResponse({
    status: 201,
    description: 'Application created successfully',
  })
  async create(@Body() createAppDto: CreateAppDto) {
    return this.appService.create(createAppDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all applications' })
  @ApiResponse({ status: 200, description: 'List of all applications' })
  async findAll() {
    return this.appService.findAll();
  }

  @Get(':token')
  @ApiOperation({ summary: 'Get an application by token' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiResponse({ status: 200, description: 'Application found' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async findOne(@Param('token', ParseIntPipe) token: number) {
    const app = await this.appService.findByToken(token);
    return {
      token: app.token,
      name: app.name,
      chat_count: app.chat_count,
    };
  }

  @Patch(':token')
  @ApiOperation({ summary: 'Update an application' })
  @ApiParam({ name: 'token', description: 'Application token' })
  @ApiResponse({ status: 200, description: 'Application updated successfully' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async update(
    @Param('token', ParseIntPipe) token: number,
    @Body() updateAppDto: UpdateAppDto,
  ) {
    const app = await this.appService.update(token, updateAppDto);
    return {
      token: app.token,
      name: app.name,
      chat_count: app.chat_count,
    };
  }
}
