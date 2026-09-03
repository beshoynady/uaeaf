import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
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
}
