import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { GovernanceDocumentsService } from './governance-documents.service.js';
import { CreateGovernanceDocumentDto } from './dto/create-governance-documents.dto.js';

/** Implements: governanceDocuments collection, Domain 1 — Federation & Governance. */
@ApiTags('governance-documents')
@Controller('governance-documents')
export class GovernanceDocumentsController {
  constructor(private readonly service: GovernanceDocumentsService) {}

  @Post()
  @RequirePermission('governanceDocuments', 'Create')
  create(@Body() dto: CreateGovernanceDocumentDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('governanceDocuments', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('governanceDocuments', 'Read')
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
  @RequirePermission('governanceDocuments', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
