import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { RevisionsService } from './revisions.service.js';
import { CreateRevisionDto } from './dto/create-revision.dto.js';

/** Implements: revisions collection, Domain 7. No DELETE route exists on
 *  this controller, deliberately — see RevisionsService. */
@ApiTags('revisions')
@Controller('revisions')
export class RevisionsController {
  constructor(private readonly service: RevisionsService) {}

  @Post()
  @RequirePermission('revisions', 'Create')
  create(@Body() dto: CreateRevisionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create({
      entityType: dto.entityType,
      entityId: new Types.ObjectId(dto.entityId),
      snapshotData: dto.snapshotData,
      createdBy: new Types.ObjectId(user.userId),
    });
  }

  @Get(':id')
  @RequirePermission('revisions', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }
}
