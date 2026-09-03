import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { PresidentMessagePagesService } from './president-message-page.service.js';
import { CreatePresidentMessagePageDto } from './dto/create-president-message-page.dto.js';

/** Implements: presidentMessagePage collection, Domain 1 — Federation & Governance. */
@ApiTags('president-message-page')
@Controller('president-message-page')
export class PresidentMessagePagesController {
  constructor(private readonly service: PresidentMessagePagesService) {}

  @Post()
  @RequirePermission('presidentMessagePage', 'Create')
  create(@Body() dto: CreatePresidentMessagePageDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('presidentMessagePage', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('presidentMessagePage', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** The sole public read path for a workflow-governed entity: reads
   *  through `publications → revisions.snapshotData`, never this
   *  collection's own row (Week 2 "Approved ≠ Published" rule). Returns
   *  `null` when there is no current Live publication. */
  @Get(':id/public')
  @Public()
  getPublicSnapshot(@Param('id') id: string) {
    return this.service.getPublicSnapshot(id);
  }

  @Delete(':id')
  @RequirePermission('presidentMessagePage', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
