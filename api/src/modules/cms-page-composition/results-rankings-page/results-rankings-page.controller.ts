import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Types } from 'mongoose';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ToggleActiveDto } from '../../../common/dto/toggle-active.dto.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ResultsRankingsPageService } from './results-rankings-page.service.js';
import { UpsertResultsRankingsPageDto } from './dto/upsert-results-rankings-page.dto.js';

/** Implements: resultsRankingsPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('results-rankings-page')
@Controller('results-rankings-page')
export class ResultsRankingsPageController {
  constructor(private readonly service: ResultsRankingsPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('resultsRankingsPage', 'Update')
  upsert(@Body() dto: UpsertResultsRankingsPageDto) {
    return this.service.upsert(dto);
  }

  /**
   * Switches the page on or off for visitors, at once.
   *
   * No `:id`: this collection is a singleton (decision #8), so there is one row
   * to switch and a path parameter would be a second way to name it.
   *
   * Gated on `Publish`, not `Update` — deciding what the public sees is a
   * publishing decision, and an editor who may rewrite the page still may not
   * decide the moment it appears (ADR-0102 §D2). The response carries the
   * document, and so `_id`: the audit-log interceptor records a write only when
   * it can name the record.
   */
  @Patch('active')
  @RequirePermission('resultsRankingsPage', 'Publish')
  setActive(@Body() dto: ToggleActiveDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setActive(dto.isActive, new Types.ObjectId(user.userId));
  }
}
