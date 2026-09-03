import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface.js';
import { MediaAssetsService } from './media-assets.service.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';

/** Implements: mediaAssets collection, Domain 5 — Media Center. */
@ApiTags('media-assets')
@Controller('media-assets')
export class MediaAssetsController {
  constructor(private readonly service: MediaAssetsService) {}

  @Post()
  @RequirePermission('mediaAssets', 'Create')
  create(@Body() dto: CreateMediaAssetDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('mediaAssets', 'Read')
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @RequirePermission('mediaAssets', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Delete(':id')
  @RequirePermission('mediaAssets', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
