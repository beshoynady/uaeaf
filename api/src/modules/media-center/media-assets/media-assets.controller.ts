import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { MediaAssetsService } from './media-assets.service.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { MediaAssetPublicResponseDto } from './dto/media-asset-public-response.dto.js';
import { Public } from '../../../common/decorators/public.decorator.js';

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

  /** Resolves media references for the public site.
   *
   *  Declared ahead of `GET :id` so `public` is never swallowed as an `:id`
   *  value — the same route-ordering convention `albums.controller.ts` and
   *  `pages.controller.ts` already follow.
   *
   *  Until this existed, every route here required `mediaAssets:Read`, so an
   *  anonymous visitor got a 401 for the hero image of a published page. The
   *  visibility contract is unchanged and identical to the public album grid:
   *  hidden and archived assets do not appear, and the response carries the
   *  public-safe shape only — no `storageKey`, no `checksum`, no `albumId`.
   */
  @Get('public')
  @Public()
  @ApiQuery({
    name: 'ids',
    required: false,
    description:
      'Comma-separated MediaAsset ids. Malformed ids are ignored rather than rejected; at most 50 ' +
      'are resolved per request. Assets that are hidden or archived are simply absent from the ' +
      'response, so the caller must not assume a 1:1 mapping with what it asked for.',
  })
  @ApiOkResponse({ type: [MediaAssetPublicResponseDto] })
  findPublicByIds(@Query('ids') ids?: string): Promise<MediaAssetPublicResponseDto[]> {
    const requested = (ids ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    return this.service.findPublicByIds(requested);
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
