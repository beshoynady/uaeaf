import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { OrganizationalStructureNodesService } from './organizational-structure.service.js';
import {
  CreateOrganizationalStructureNodeDto,
  SetParentNodeDto,
} from './dto/create-organizational-structure.dto.js';

/** Implements: organizationalStructure collection, Domain 1 — Federation & Governance. */
@ApiTags('organizational-structure')
@Controller('organizational-structure')
export class OrganizationalStructureNodesController {
  constructor(private readonly service: OrganizationalStructureNodesService) {}

  @Post()
  @RequirePermission('organizationalStructure', 'Create')
  create(@Body() dto: CreateOrganizationalStructureNodeDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('organizationalStructure', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('organizationalStructure', 'Read')
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

  /** Re-parents a node. Rejects self-parenting and any move that would
   *  close a cycle in the org tree. */
  @Patch(':id/parent')
  @RequirePermission('organizationalStructure', 'Update')
  setParent(@Param('id') id: string, @Body() dto: SetParentNodeDto) {
    return this.service.setParent(id, dto);
  }

  @Delete(':id')
  @RequirePermission('organizationalStructure', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
