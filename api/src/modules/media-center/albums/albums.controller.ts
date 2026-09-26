import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, ApiQuery, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { AlbumsService } from './albums.service.js';
import { CreateAlbumDto } from './dto/create-album.dto.js';
import { UpdateAlbumDto } from './dto/update-album.dto.js';
import { AlbumCoverDto, AlbumPhotoOrderDto } from './dto/album-photo-order.dto.js';
import { AlbumDetailPageResponseDto } from './dto/album-detail-page-response.dto.js';
import { AlbumPublicResponseDto } from './dto/album-public-response.dto.js';
import { AlbumListQueryDto } from './dto/album-list-query.dto.js';
import {
  AlbumFacetsDto,
  AlbumListResponseDto,
  AlbumStatsDto,
} from './dto/album-list-response.dto.js';

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

  /**
   * The public gallery listing.
   *
   * Declared before `public/:slug` — Nest matches in declaration order, and a
   * literal segment placed after a parameter is swallowed by it. Every route
   * below follows the same rule for the same reason.
   */
  @Get('public')
  @Public()
  @ApiOkResponse({ type: AlbumListResponseDto })
  listPublic(@Query() query: AlbumListQueryDto): Promise<AlbumListResponseDto> {
    return this.service.listPublic(query, query.page, query.limit);
  }

  /** Which filter options exist, and how many albums each holds. A filter
   *  whose list is empty is not drawn at all, so this is what decides the
   *  shape of the filter bar. */
  @Get('public/facets')
  @Public()
  @ApiOkResponse({ type: AlbumFacetsDto })
  facets(): Promise<AlbumFacetsDto> {
    return this.service.facets();
  }

  /** The album the gallery leads with. `null` — still 200 — when nothing is
   *  published yet. */
  @Get('public/featured')
  @Public()
  @ApiOkResponse({
    schema: { oneOf: [{ $ref: getSchemaPath(AlbumPublicResponseDto) }, { type: 'null' }] },
  })
  @ApiExtraModels(AlbumPublicResponseDto)
  featured(): Promise<AlbumPublicResponseDto | null> {
    return this.service.featured();
  }

  /** The hero's three figures. */
  @Get('public/stats')
  @Public()
  @ApiOkResponse({ type: AlbumStatsDto })
  stats(): Promise<AlbumStatsDto> {
    return this.service.stats();
  }

  /** The individual public album page: `/albums/public/:slug`. Declared last
   *  of the `public/*` group so a literal like `facets` is never read as a
   *  slug, and ahead of `GET :id` so `public` is never swallowed as an id —
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
  @ApiQuery({
    name: 'skip',
    required: false,
    description:
      'How many photos to skip, for the viewer’s next page. Photos come 40 at a time; the response ' +
      'carries `photoTotal` so the caller knows when it has them all. A malformed value is read as 0, ' +
      'because a stale link must not turn a public page into an error.',
  })
  getPublicBySlug(
    @Param('slug') slug: string,
    @Query('skip') skip?: string,
  ): Promise<AlbumDetailPageResponseDto | null> {
    const parsed = Number.parseInt(skip ?? '', 10);
    return this.service.getPublicBySlug(slug, Number.isFinite(parsed) && parsed > 0 ? parsed : 0);
  }

  @Get(':id')
  @RequirePermission('albums', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  /** Edits an album. Cannot rename it and cannot publish it — see
   *  `UpdateAlbumDto` for why neither belongs on a general edit. */
  @Patch(':id')
  @RequirePermission('albums', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateAlbumDto) {
    return this.service.update(id, dto);
  }

  /**
   * Rewrites the display order of every photo in the album.
   *
   * There is deliberately no "register a batch of photos" route: a photo joins
   * an album through `POST /media-assets/upload` with `albumId`, which stores
   * the file, writes the record and maintains `assetCount` in one place. A
   * second path into the same state would be a second place for that count to
   * drift.
   */
  @Patch(':id/photos/order')
  @RequirePermission('albums', 'Update')
  reorderPhotos(@Param('id') id: string, @Body() dto: AlbumPhotoOrderDto) {
    return this.service.reorderPhotos(id, dto.photoIds);
  }

  /** Archives one photo of this album, promoting the next one to cover when
   *  the removed photo held it. */
  @Delete(':id/photos/:photoId')
  @RequirePermission('albums', 'Update')
  removePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.removePhoto(id, photoId, new Types.ObjectId(user.userId));
  }

  /** Designates one of the album's own photos as its cover. */
  @Patch(':id/cover')
  @RequirePermission('albums', 'Update')
  setCover(@Param('id') id: string, @Body() dto: AlbumCoverDto) {
    return this.service.setCover(id, dto.photoId);
  }

  /** Makes this the gallery's featured album, clearing whoever held it. */
  @Patch(':id/featured')
  @RequirePermission('albums', 'Update')
  setFeatured(@Param('id') id: string) {
    return this.service.setFeatured(id);
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
