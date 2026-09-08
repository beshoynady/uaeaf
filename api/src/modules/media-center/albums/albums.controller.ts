import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { AlbumsService } from './albums.service.js';
import { CreateAlbumDto } from './dto/create-album.dto.js';
import { AlbumDetailPageResponseDto } from './dto/album-detail-page-response.dto.js';

/** Implements: albums collection, Domain 5 — Media Center. */
@ApiTags('albums')
@Controller('albums')
export class AlbumsController {
  constructor(private readonly service: AlbumsService) {}

  @Post()
  @RequirePermission('albums', 'Create')
  create(@Body() dto: CreateAlbumDto) {
    return this.service.create(dto);
  }

  @Get()
  @RequirePermission('albums', 'Read')
  findAll() {
    return this.service.findAll();
  }

  /** The individual public album page: `/albums/public/:slug`. Declared
   *  ahead of `GET :id` so `public` is never swallowed as an `:id` value —
   *  matching `pages.controller.ts`/`athlete-profiles.controller.ts`'s
   *  established route-ordering convention (2026-09-04 follow-on to
   *  ADR-0054). */
  @Get('public/:slug')
  @Public()
  @ApiExtraModels(AlbumDetailPageResponseDto)
  @ApiOkResponse({
    description:
      'The album detail page composite (album + visible photos + related albums). Literally `null` ' +
      'in the response body — still HTTP 200, not 404 — when no Published album matches `slug`; the ' +
      'caller is responsible for treating a null body as not-found (matches the `AthleteProfilesService` ' +
      'convention this endpoint was built from).',
    schema: { oneOf: [{ $ref: getSchemaPath(AlbumDetailPageResponseDto) }, { type: 'null' }] },
  })
  getPublicBySlug(@Param('slug') slug: string): Promise<AlbumDetailPageResponseDto | null> {
    return this.service.getPublicBySlug(slug);
  }

  @Get(':id')
  @RequirePermission('albums', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** The only route that may move an album into `Published` — gated by a
   *  dedicated `Publish` permission, distinct from `Create`/`Update`. */
  @Patch(':id/publish')
  @RequirePermission('albums', 'Publish')
  publish(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.publish(id, new Types.ObjectId(user.userId));
  }

  @Delete(':id')
  @RequirePermission('albums', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }
}
