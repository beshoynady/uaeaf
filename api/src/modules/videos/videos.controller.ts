import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { VideosService } from './videos.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';

/** Implements: videos collection, Domain 5 — Media Center. */
@ApiTags('videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly service: VideosService) {}

  @Post()
  @RequirePermission('videos', 'Create')
  create(@Body() dto: CreateVideoDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('videos', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('videos', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('videos', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
