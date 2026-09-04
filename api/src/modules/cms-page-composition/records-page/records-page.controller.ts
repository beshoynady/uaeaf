import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RecordsPageService } from './records-page.service.js';
import { UpsertRecordsPageDto } from './dto/upsert-records-page.dto.js';

/** Implements: recordsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('records-page')
@Controller('records-page')
export class RecordsPageController {
  constructor(private readonly service: RecordsPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('recordsPage', 'Update')
  upsert(@Body() dto: UpsertRecordsPageDto) {
    return this.service.upsert(dto);
  }
}
