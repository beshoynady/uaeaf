import { Body, Controller, Get, Patch, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Types } from 'mongoose';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { ToggleActiveDto } from '../../../common/dto/toggle-active.dto.js';
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
  @RequirePermission('committeesPage', 'Publish')
  setActive(@Body() dto: ToggleActiveDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.setActive(dto.isActive, new Types.ObjectId(user.userId));
  }
}
