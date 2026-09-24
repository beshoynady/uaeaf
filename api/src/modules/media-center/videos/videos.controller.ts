import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../../common/decorators/public.decorator.js';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { VideosService } from './videos.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { UpdateVideoDto } from './dto/update-video.dto.js';
import { QueryPublicVideosDto } from './dto/query-public-videos.dto.js';
import { VideoPublicResponseDto } from './dto/video-public-response.dto.js';
import { ResolveVideoDto } from './dto/resolve-video.dto.js';

/** Implements: videos collection, Domain 5 — Media Center. */
@ApiTags('videos')
@Controller('videos')
export class VideosController {
  constructor(private readonly service: VideosService) {}

  /**
   * The public video library.
   *
   * Declared before `@Get(':id')` because Nest matches routes in declaration
   * order: registered after it, `public` would be read as an id and answer
   * 404 for every visitor.
   */
  @Get('public')
  @Public()
  @ApiOkResponse({ type: [VideoPublicResponseDto] })
  findPublic(@Query() query: QueryPublicVideosDto) {
    const { page, limit, ...narrow } = query;
    return this.service.findPublicPage(page ?? 1, limit ?? 12, narrow);
  }

  @Post()
  @RequirePermission('videos', 'Create')
  create(@Body() dto: CreateVideoDto) {
    return this.service.create(dto);
  }

  /**
   * Read a pasted link's platform, title and thumbnail.
   *
   * `Create` rather than `Read`: this makes an outbound HTTP request on
   * caller-supplied input, so the permission that guards it is the one for
   * adding a video, not the one for looking at the list.
   */
  @Post('resolve')
  @RequirePermission('videos', 'Create')
  resolve(@Body() dto: ResolveVideoDto) {
    return this.service.resolve(dto.url);
  }

  @Patch(':id')
  @RequirePermission('videos', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateVideoDto) {
    return this.service.update(id, dto);
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
