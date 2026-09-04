import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { VideosPageService } from './videos-page.service.js';
import { UpsertVideosPageDto } from './dto/upsert-videos-page.dto.js';

/** Implements: videosPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page furniture
 *  with no `publicationState` gate (not workflow-governed), so it is
 *  served directly rather than through `publications`. */
@ApiTags('videos-page')
@Controller('videos-page')
export class VideosPageController {
  constructor(private readonly service: VideosPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('videosPage', 'Update')
  upsert(@Body() dto: UpsertVideosPageDto) {
    return this.service.upsert(dto);
  }
}
