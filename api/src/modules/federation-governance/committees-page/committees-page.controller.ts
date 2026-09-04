import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { CommitteesPagesService } from './committees-page.service.js';
import { UpsertCommitteesPageDto } from './dto/upsert-committees-page.dto.js';

/** Implements: committeesPage collection, Domain 1 — Federation &
 *  Governance. Singleton: GET reads the one row, PUT upserts it. The GET is
 *  `@Public()` — page furniture with no publicationState gate. */
@ApiTags('committees-page')
@Controller('committees-page')
export class CommitteesPagesController {
  constructor(private readonly service: CommitteesPagesService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('committeesPage', 'Update')
  upsert(@Body() dto: UpsertCommitteesPageDto) {
    return this.service.upsert(dto);
  }
}
