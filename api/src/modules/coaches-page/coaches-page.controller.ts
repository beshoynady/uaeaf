import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CoachesPageService } from './coaches-page.service.js';
import { UpsertCoachesPageDto } from './dto/upsert-coaches-page.dto.js';

/** Implements: coachesPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('coaches-page')
@Controller('coaches-page')
export class CoachesPageController {
  constructor(private readonly service: CoachesPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('coachesPage', 'Update')
  upsert(@Body() dto: UpsertCoachesPageDto) {
    return this.service.upsert(dto);
  }
}
