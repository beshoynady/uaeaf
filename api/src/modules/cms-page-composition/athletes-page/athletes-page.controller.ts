import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { AthletesPageService } from './athletes-page.service.js';
import { UpsertAthletesPageDto } from './dto/upsert-athletes-page.dto.js';

/** Implements: athletesPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('athletes-page')
@Controller('athletes-page')
export class AthletesPageController {
  constructor(private readonly service: AthletesPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('athletesPage', 'Update')
  upsert(@Body() dto: UpsertAthletesPageDto) {
    return this.service.upsert(dto);
  }
}
