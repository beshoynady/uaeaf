import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { MediaAssetsService } from './media-assets.service.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { MediaAssetPublicResponseDto } from './dto/media-asset-public-response.dto.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ParseJsonFieldsInterceptor } from '../../../common/interceptors/parse-json-fields.interceptor.js';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto.js';
import { MAX_UPLOAD_BYTES, type UploadCandidate } from './upload/upload-constraints.js';
import { STORAGE_FOLDERS } from '../storage/storage-provider.js';

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

  /**
   * Stores a file and registers it in one request.
   *
   * `POST /media-assets` above registers an object someone else already
   * stored, and needs the caller to describe it. This one does the storing,
   * so it accepts no description of the file at all: type, dimensions, size
   * and URL are read from the bytes and from the storage provider's answer.
   *
   * `mediaAssets:Create` and nothing new — putting a file behind the same
   * grant that already creates the record keeps one answer to "who may add
   * an image", instead of two that can drift apart.
   *
   * `folder` decides where the object is filed on the provider, not who may
   * upload: an image uploaded from a page's own screen and one uploaded
   * into the library are the same kind of object under the same permission,
   * and separating them only keeps the provider's console navigable.
   */
  @Post('upload')
  @RequirePermission('mediaAssets', 'Create')
  @UseInterceptors(
    FileInterceptor('file', {
      // Multer's own ceiling, so a file past the limit is refused while it
      // is still arriving rather than after it has all been buffered.
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
    }),
    // Strictly second: the first interceptor is what parses the multipart
    // body and puts the text parts on the request, and this one reshapes
    // them. Reversed, it would run against a body that does not exist yet.
    new ParseJsonFieldsInterceptor(['caption', 'altText']),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description:
      'The image as `file`, plus the metadata fields. `caption` and `altText` are JSON objects ' +
      'with `ar` and `en` keys, sent as JSON text because every multipart part is a string.',
    type: UploadMediaAssetDto,
  })
  upload(
    @UploadedFile() file: UploadCandidate,
    @Body() dto: UploadMediaAssetDto,
    @Query('scope') scope?: string,
  ) {
    return this.service.uploadAndCreate(
      file,
      dto,
      scope === 'library' ? STORAGE_FOLDERS.library : STORAGE_FOLDERS.pages,
    );
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

  /** Archives the asset. The stored object is deliberately left in place:
   *  an archive whose file has been destroyed is not an archive. Use
   *  `DELETE :id/object` to end it. */
  @Delete(':id')
  @RequirePermission('mediaAssets', 'Delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, new Types.ObjectId(user.userId));
  }

  /**
   * Destroys the stored object and removes the record permanently.
   *
   * The deliberate second step. It refuses an asset that has not been
   * archived first, so no single request can take the image out from under
   * a published page, and it destroys the object before deleting the row —
   * reversed, a provider failure would leave a file nothing points at,
   * consuming quota unseen.
   */
  @Delete(':id/object')
  @RequirePermission('mediaAssets', 'Delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  purge(@Param('id') id: string) {
    return this.service.purge(id);
  }
}
