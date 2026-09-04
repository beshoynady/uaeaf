import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { NewsPageService } from './news-page.service.js';
import { UpsertNewsPageDto } from './dto/upsert-news-page.dto.js';

/** Implements: newsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('news-page')
@Controller('news-page')
export class NewsPageController {
  constructor(private readonly service: NewsPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('newsPage', 'Update')
  upsert(@Body() dto: UpsertNewsPageDto) {
    return this.service.upsert(dto);
  }
}
