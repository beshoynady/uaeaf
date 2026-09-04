import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { DisciplinesPageService } from './disciplines-page.service.js';
import { UpsertDisciplinesPageDto } from './dto/upsert-disciplines-page.dto.js';

/** Implements: disciplinesPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('disciplines-page')
@Controller('disciplines-page')
export class DisciplinesPageController {
  constructor(private readonly service: DisciplinesPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('disciplinesPage', 'Update')
  upsert(@Body() dto: UpsertDisciplinesPageDto) {
    return this.service.upsert(dto);
  }
}
