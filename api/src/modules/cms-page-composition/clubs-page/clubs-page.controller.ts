import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ClubsPageService } from './clubs-page.service.js';
import { UpsertClubsPageDto } from './dto/upsert-clubs-page.dto.js';

/** Implements: clubsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('clubs-page')
@Controller('clubs-page')
export class ClubsPageController {
  constructor(private readonly service: ClubsPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('clubsPage', 'Update')
  upsert(@Body() dto: UpsertClubsPageDto) {
    return this.service.upsert(dto);
  }
}
