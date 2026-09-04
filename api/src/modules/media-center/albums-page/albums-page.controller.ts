import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AlbumsPageService } from './albums-page.service.js';
import { UpsertAlbumsPageDto } from './dto/upsert-albums-page.dto.js';

/** Implements: albumsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page furniture
 *  with no `publicationState` gate (not workflow-governed), so it is
 *  served directly rather than through `publications`. */
@ApiTags('albums-page')
@Controller('albums-page')
export class AlbumsPageController {
  constructor(private readonly service: AlbumsPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('albumsPage', 'Update')
  upsert(@Body() dto: UpsertAlbumsPageDto) {
    return this.service.upsert(dto);
  }
}
