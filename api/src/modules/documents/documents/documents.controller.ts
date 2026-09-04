import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import type { DocumentOwnerType } from './schemas/document.schema.js';

/** Implements: documents collection, Domain 6. */
@ApiTags('documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Post()
  @RequirePermission('documents', 'Create')
  create(@Body() dto: CreateDocumentDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('documents', 'Read')
  findAll(@Query('ownerType') ownerType?: DocumentOwnerType, @Query('ownerId') ownerId?: string) {
    if (ownerType && ownerId) {
      return this.service.findByOwner(ownerType, ownerId);
    }
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('documents', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/public')
  @RequirePermission('documents', 'Read')
  getPublicSnapshot(@Param('id') id: string) {
    return this.service.getPublicSnapshot(id);
  }

  @Delete(':id')
  @RequirePermission('documents', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
