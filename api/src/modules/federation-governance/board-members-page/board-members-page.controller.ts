import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { BoardMembersPageService } from './board-members-page.service.js';
import { UpsertBoardMembersPageDto } from './dto/upsert-board-members-page.dto.js';

/** Implements: boardMembersPage collection, Domain 11 — CMS & Page Composition.
 *  Singleton: no `:id` routes and no POST — GET reads the one row, PUT
 *  upserts it. The GET is `@Public()`: this is public-facing page
 *  furniture with no `publicationState` gate (not workflow-governed), so
 *  it is served directly rather than through `publications`. */
@ApiTags('board-members-page')
@Controller('board-members-page')
export class BoardMembersPageController {
  constructor(private readonly service: BoardMembersPageService) {}

  @Get()
  @Public()
  get() {
    return this.service.get();
  }

  @Put()
  @RequirePermission('boardMembersPage', 'Update')
  upsert(@Body() dto: UpsertBoardMembersPageDto) {
    return this.service.upsert(dto);
  }
}
