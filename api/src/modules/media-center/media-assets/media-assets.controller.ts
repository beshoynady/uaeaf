import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { SkipAuditLog } from '../../../common/decorators/skip-audit-log.decorator.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { MediaAssetsService } from './media-assets.service.js';
import { MediaAssetPurgeService } from './media-asset-purge.service.js';
import { UnusedMediaService } from './unused-media.service.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto.js';
import { ArchiveMediaAssetDto } from './dto/archive-media-asset.dto.js';
import { MediaAssetPublicResponseDto } from './dto/media-asset-public-response.dto.js';
import { UnusedMediaReportDto } from './dto/unused-media-response.dto.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { ParseJsonFieldsInterceptor } from '../../../common/interceptors/parse-json-fields.interceptor.js';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto.js';
import { MAX_UPLOAD_BYTES, type UploadCandidate } from './upload/upload-constraints.js';
import { STORAGE_FOLDERS } from '../storage/storage-provider.js';

/** Implements: mediaAssets collection, Domain 5 — Media Center. */
@ApiTags('media-assets')
@Controller('media-assets')
export class MediaAssetsController {
  constructor(
    private readonly service: MediaAssetsService,
    private readonly purgeService: MediaAssetPurgeService,
    private readonly unusedMediaService: UnusedMediaService,
  ) {}

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
  @ApiQuery({
    name: 'purpose',
    required: false,
    enum: ['icon'],
    description:
      'What the picture is for. `icon` lowers the shortest-edge floor from 200px to 88px, for a ' +
      'social channel icon drawn at 44px. The accepted formats, the byte ceiling and the megapixel ' +
      'ceiling are the same for every purpose. Absent or any other value: a page image.',
  })
  upload(
    @UploadedFile() file: UploadCandidate,
    @Body() dto: UploadMediaAssetDto,
    @Query('scope') scope?: string,
    @Query('purpose') purpose?: string,
  ) {
    return this.service.uploadAndCreate(
      file,
      dto,
      scope === 'library' ? STORAGE_FOLDERS.library : STORAGE_FOLDERS.pages,
      // Anything but the one known word is a page image, held to the page floor.
      purpose === 'icon' ? 'icon' : 'page',
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

  /**
   * Archived media nothing references any more, and how much space purging
   * it would recover — the report that informs `mediaAssets:PermanentDelete`,
   * which is why it carries the same authority rather than `Read`.
   *
   * Declared ahead of `GET :id`, or `:id` would swallow `unused` as an id
   * lookup — the same route-ordering convention as `GET 'public'` above.
   *
   * Ships inert in this batch: the row's only action is the purge, and every
   * `PermanentDelete` refuses with the step-up code until step-up exists
   * (ADR-0120).
   */
  @Get('unused')
  @RequirePermission('mediaAssets', 'PermanentDelete')
  @ApiQuery({ name: 'skip', required: false, description: 'How many rows to skip. Malformed or negative reads as 0.' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Rows per page, capped at 100. Malformed, zero or negative reads as the default, 50.',
  })
  @ApiOkResponse({ type: UnusedMediaReportDto })
  unused(@Query('skip') skip?: string, @Query('limit') limit?: string): Promise<UnusedMediaReportDto> {
    const parsedSkip = Number.parseInt(skip ?? '', 10);
    const parsedLimit = Number.parseInt(limit ?? '', 10);
    return this.unusedMediaService.report({
      skip: Number.isFinite(parsedSkip) && parsedSkip > 0 ? parsedSkip : 0,
      limit: Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50,
    });
  }

  @Get(':id')
  @RequirePermission('mediaAssets', 'Read')
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @RequirePermission('mediaAssets', 'Update')
  update(@Param('id') id: string, @Body() dto: UpdateMediaAssetDto) {
    return this.service.update(id, dto);
  }

  /**
   * Archives the asset. The stored object is deliberately left in place:
   * an archive whose file has been destroyed is not an archive. Use
   * `DELETE :id/object` to end it.
   *
   * Refuses `409 mediaInUse`, naming every place the image is still used,
   * unless the body carries `acknowledgeReferences: true` — see
   * `MediaAssetsService.remove`.
   */
  @Delete(':id')
  @RequirePermission('mediaAssets', 'Archive')
  remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ArchiveMediaAssetDto,
  ) {
    return this.service.remove(id, new Types.ObjectId(user.userId), dto);
  }

  /** Brings an archived asset back, and restores its album's photo count with
   *  it. Not `:id/restore`: that path is the revision restore elsewhere in this
   *  API (ADR-0120). */
  @Post(':id/unarchive')
  @RequirePermission('mediaAssets', 'Restore')
  unarchive(@Param('id') id: string) {
    return this.service.unarchive(id);
  }

  /**
   * Destroys the stored object and removes the record permanently.
   *
   * The deliberate second step, and the only irreversible one on this platform.
   * Its four conditions are in ADR-0120 and every one of them is checked in the
   * service, which is what makes them unskippable: the third, step-up
   * verification, has nothing to verify against in this API, so every request
   * here is refused before anything is read or destroyed.
   */
  @Delete(':id/object')
  @RequirePermission('mediaAssets', 'PermanentDelete')
  @SkipAuditLog()
  @HttpCode(HttpStatus.NO_CONTENT)
  purge(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return this.purgeService.permanentDelete(id, user, extractRequestContext(req));
  }
}
