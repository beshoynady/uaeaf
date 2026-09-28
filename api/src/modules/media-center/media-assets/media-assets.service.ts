import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { MediaAssetsRepository } from './media-assets.repository.js';
import type { MediaAssetDocument } from './schemas/media-asset.schema.js';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto.js';
import { UpdateMediaAssetDto } from './dto/update-media-asset.dto.js';
import { UploadMediaAssetDto } from './dto/upload-media-asset.dto.js';
import { ArchiveMediaAssetDto } from './dto/archive-media-asset.dto.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';
import { assertUploadable, type UploadCandidate, type UploadPurpose } from './upload/upload-constraints.js';
import { STORAGE_PROVIDER, type StorageFolder, type StorageProvider } from '../storage/storage-provider.js';
import { MediaAssetPublicResponseDto } from './dto/media-asset-public-response.dto.js';
import type { PublicImageDto } from '../../../common/dto/public-page.dto.js';
import { Album } from '../albums/schemas/album.schema.js';
import type { AlbumDocument } from '../albums/schemas/album.schema.js';
import { orphanedMediaCandidates } from '../../../common/authz/orphaned-media.js';
import type { MediaAssetReferrer } from '../../../common/authz/media-references.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { auditActionFor } from '../../workflow/audit-logs/audit-action.util.js';

/**
 * The live-references scan `remove()` needs before an archive, bound to the
 * connection so the caller decides only what it is entitled to: whether to
 * count revisions. `ignore` is deliberately not part of this shape — nothing
 * here ever needs to suppress a referrer, unlike the album path, which gets
 * its own token in `albums.service.ts`.
 */
export type MediaAssetLiveReferrerScan = (
  id: string,
  options?: { includeRevisions?: boolean },
) => Promise<MediaAssetReferrer[]>;

/** Injection token for `MediaAssetLiveReferrerScan`. */
export const MEDIA_ASSET_LIVE_REFERRER_SCAN = Symbol('MEDIA_ASSET_LIVE_REFERRER_SCAN');

/** What `remove()` learned before archiving: either a real list of live
 *  referrers, or a scan that could not complete — never both meanings folded
 *  into one empty list. */
interface LiveReferenceCheck {
  referrers: MediaAssetReferrer[];
  scanIncomplete: boolean;
}

/** Implements: mediaAssets collection, Domain 5 — Media Center (FigJam
 *  node `92:7269`). Plain CRUD, plus maintaining the parent album's
 *  denormalized `assetCount` (2026-09-04 media-gallery hardening pass).
 *
 *  Injects the `Album` Mongoose model directly rather than depending on
 *  `AlbumsService`/`AlbumsRepository`: `AlbumsModule` already imports
 *  `MediaAssetsModule` (for `assertUsableImage()`), so importing
 *  `AlbumsModule` back here would create a circular module dependency.
 *  Registering the same model+schema pair in a second module's
 *  `forFeature()` is safe — Mongoose reuses the already-compiled model
 *  for a given connection+name as long as the schema instance is
 *  reference-identical, which it is here (`AlbumSchema` is a singleton
 *  import from `album.schema.ts`). */
@Injectable()
export class MediaAssetsService {
  private readonly logger = new Logger(MediaAssetsService.name);

  /** Ceiling on how many assets one anonymous request may resolve. A page
   *  never legitimately needs more; without it the endpoint is a free bulk
   *  export of the media table to anyone who can generate ObjectIds. */
  private static readonly PUBLIC_ID_LIMIT = 50;

  constructor(
    private readonly repository: MediaAssetsRepository,
    @InjectModel(Album.name) private readonly albumModel: Model<AlbumDocument>,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    // Optional: the many unit tests across this module construct this class
    // directly with three arguments, and `orphanedMediaCandidates` below is
    // the only method that needs a connection at all.
    @InjectConnection() private readonly connection?: Connection,
    @Inject(MEDIA_ASSET_LIVE_REFERRER_SCAN) private readonly findLiveReferrers?: MediaAssetLiveReferrerScan,
    private readonly auditLogsService?: AuditLogsService,
  ) {}

  /** Shared validation for every consumer that references a `MediaAsset`
   *  as a cover/profile image (`albums.coverImageId`, `athleteProfiles`/
   *  `officialProfiles.photoId`, ...) — one place enforcing "exists, not
   *  archived, actually an image" instead of each module hand-rolling it.
   *  @throws NotFoundException when `id` doesn't reference an existing,
   *  non-archived `MediaAsset`.
   *  @throws ConflictException when it exists but isn't an image type. */
  async assertUsableImage(id: string): Promise<void> {
    const asset = await this.findById(id);
    if (!asset) {
      throw new NotFoundException(`MediaAsset ${id} not found.`);
    }
    if (!asset.file.mimeType.startsWith('image/')) {
      throw new ConflictException(`MediaAsset ${id} is not a valid image type.`);
    }
  }

  /** Which of these ids an editorial save just stopped using, and nothing
   *  else references any more — see `orphaned-media.ts` for why this never
   *  fails the save it is called from. */
  async orphanedMediaCandidates(removedIds: readonly (Types.ObjectId | string)[]): Promise<string[]> {
    if (!this.connection) {
      return [];
    }
    return orphanedMediaCandidates(this.connection, removedIds);
  }

  async create(dto: CreateMediaAssetDto): Promise<MediaAssetDocument> {
    const asset = await this.repository.create({
      albumId: dto.albumId ? new Types.ObjectId(dto.albumId) : null,
      // checksum isn't accepted from the client (see MediaFileDto's
      // comment) -- always stored as null until an upload-time hashing
      // step exists.
      file: {
        ...dto.file,
        checksum: null,
        photographer: dto.file.photographer ?? null,
        captureDate: dto.file.captureDate ? new Date(dto.file.captureDate) : null,
      },
      caption: dto.caption,
      altText: dto.altText,
      displayOrder: dto.displayOrder,
      isVisible: dto.isVisible ?? true,
      isFeatured: dto.isFeatured ?? false,
      isAiGenerated: dto.isAiGenerated ?? false,
    });
    if (asset.albumId) {
      await this.albumModel.updateOne({ _id: asset.albumId }, { $inc: { assetCount: 1 } }).exec();
    }
    return asset;
  }

  /**
   * Stores an uploaded file and registers it as an asset.
   *
   * The order is the contract. The bytes are verified first, so a file the
   * provider would refuse never leaves this process; then the object is
   * stored; only then is a record written. A record is therefore never
   * created for an object that does not exist.
   *
   * Every field describing the file comes from one of two trustworthy
   * sources — the bytes themselves or the provider's answer. Nothing is
   * taken from the request, which is why `UploadMediaAssetDto` carries no
   * file fields to take.
   *
   * `purpose` changes only the shortest edge a picture may have; see
   * `ICON_MIN_EDGE`.
   */
  async uploadAndCreate(
    file: UploadCandidate,
    dto: UploadMediaAssetDto,
    folder: StorageFolder,
    purpose: UploadPurpose = 'page',
  ): Promise<MediaAssetDocument> {
    assertUploadable(file, { purpose });

    const stored = await this.storage.upload({
      buffer: file.buffer,
      folder,
      originalName: file.originalname,
    });

    // Storing the bytes and writing the row are one operation or neither.
    // Without this, any failure past the upload -- a schema refusal, a lost
    // connection -- leaves a file on the provider that nothing points at,
    // which is the orphan the delete policy exists to prevent. Observed
    // against the running API before it was written: a request rejected at
    // the schema still left its image behind.
    let asset: MediaAssetDocument;
    try {
      asset = await this.repository.create({
        albumId: dto.albumId ? new Types.ObjectId(dto.albumId) : null,
        file: {
          url: stored.url,
          mimeType: stored.mimeType,
          width: stored.width,
          height: stored.height,
          size: stored.bytes,
          originalName: file.originalname,
          storageKey: stored.storageKey,
          checksum: null,
          photographer: dto.photographer ?? null,
          captureDate: dto.captureDate ? new Date(dto.captureDate) : null,
        },
        caption: dto.caption,
        altText: dto.altText,
        // A page image belongs to no album, so it has no grid to be ordered
        // within; the schema still requires the field, and 0 is the honest
        // value for "not positioned" rather than a number implying a place.
        displayOrder: dto.displayOrder ?? 0,
        isVisible: true,
        isFeatured: false,
        isAiGenerated: dto.isAiGenerated ?? false,
      });
    } catch (cause) {
      // The caller has to learn why the request really failed, so a failure
      // in the cleanup is logged and dropped rather than thrown over it.
      // There is nothing further to do about the orphan at that point.
      await this.storage.destroy(stored.storageKey).catch((sweepFailure: unknown) => {
        this.logger.error(
          `Orphaned ${stored.storageKey}: the record failed and the object could not be removed (${
            sweepFailure instanceof Error ? sweepFailure.message : String(sweepFailure)
          }).`,
        );
      });
      throw cause;
    }

    if (asset.albumId) {
      await this.albumModel.updateOne({ _id: asset.albumId }, { $inc: { assetCount: 1 } }).exec();
    }
    return asset;
  }

  /**
   * Metadata edit only — caption, alt text, display order, and the
   * featured/visible/AI-generated flags. Never `albumId` or `file`: see
   * `UpdateMediaAssetDto`'s doc comment for why both are excluded rather
   * than merely optional.
   *
   * @throws NotFoundException when no such asset exists.
   */
  async update(id: string, dto: UpdateMediaAssetDto): Promise<MediaAssetDocument> {
    const updated = await this.repository.updateById(id, partialUpdate(dto));
    if (!updated) {
      throw new NotFoundException(`MediaAsset ${id} not found.`);
    }
    return updated;
  }

  async findAll(): Promise<MediaAssetDocument[]> {
    return this.repository.find();
  }

  /** The album's first photo by display order — what becomes the cover when
   *  the current one is removed. Visible only: a hidden photo is one the
   *  editor chose not to show, and promoting it would show it. */
  async findFirstInAlbum(albumId: Types.ObjectId): Promise<MediaAssetDocument | null> {
    const [first] = await this.repository.findVisibleByAlbum(albumId);
    return first ?? null;
  }

  /** One page of an album's visible photos in display order, with the total.
   *  The album page asks for a page at a time because an album of several
   *  hundred photographs is megabytes of JSON before the first one is drawn. */
  async findPublicPageByAlbum(
    albumId: Types.ObjectId,
    skip: number,
    limit: number,
  ): Promise<{ items: MediaAssetPublicResponseDto[]; total: number }> {
    const { items, total } = await this.repository.findVisiblePageByAlbum(albumId, skip, limit);
    return { items: items.map((asset) => this.toPublicResponse(asset)), total };
  }

  /** Every photo of an album, hidden ones included: the CMS grid arranges all
   *  of them, which is why this is not `findVisibleByAlbum`. */
  async findAllInAlbum(albumId: Types.ObjectId): Promise<MediaAssetDocument[]> {
    return this.repository.find({ albumId });
  }

  /** Writes `displayOrder` from the position of each id in the list, in one
   *  round trip. A loop of saves would leave the grid half-reordered if it
   *  failed partway, and the editor would see an arrangement nobody chose. */
  async applyOrder(photoIds: readonly string[]): Promise<void> {
    await this.repository.applyOrder(photoIds);
  }

  async findById(id: string): Promise<MediaAssetDocument | null> {
    return this.repository.findById(id);
  }

  /**
   * Archives the asset and takes it out of its album's count.
   *
   * Through `archiveIfLive` rather than `softDelete`, because the count must
   * move exactly once: an asset archived twice is archived once, and only the
   * call that did it may decrement.
   *
   * Informed consent, not prevention (owner decision 2026-09-27, Batch 2 §C):
   * archiving a still-used image is allowed, but never silently. The first
   * attempt checks live references only (a revision is history, not use) and
   * refuses, naming every place the image would vanish from; a second attempt
   * carrying `acknowledgeReferences: true` archives anyway, and the audit row
   * records what was known at the time. A scan that cannot complete is
   * treated the same as "may be in use" — refusing outright would let an
   * outage block a legal takedown, and answering "nothing references it"
   * would be the exact silent failure this exists to prevent.
   *
   * @throws ConflictException `mediaInUse` when the image is still referenced
   *   and `dto.acknowledgeReferences` is not `true`, or when the reference
   *   check itself could not complete (flagged `scanIncomplete`).
   */
  async remove(
    id: string,
    archivedBy: Types.ObjectId,
    dto: ArchiveMediaAssetDto = {},
  ): Promise<MediaAssetDocument | null> {
    const { referrers, scanIncomplete } = await this.checkLiveReferences(id);

    if ((referrers.length > 0 || scanIncomplete) && !dto.acknowledgeReferences) {
      throw new ConflictException({
        code: 'mediaInUse',
        message: scanIncomplete
          ? `The reference check for MediaAsset ${id} could not complete. It may still be in use.`
          : `MediaAsset ${id} is still used in ${referrers.length} place(s).`,
        referrers,
        scanIncomplete,
      });
    }

    const archived = await this.repository.archiveIfLive(id, archivedBy);
    if (archived?.albumId) {
      await this.albumModel.updateOne({ _id: archived.albumId }, { $inc: { assetCount: -1 } }).exec();
    }
    if (archived) {
      await this.writeArchiveAudit(archived, archivedBy, referrers, scanIncomplete);
    }
    return archived ?? this.repository.findIncludingArchived(id);
  }

  /** Live references only (revisions excluded): a frozen snapshot is
   *  permanent history and archiving is reversible, so counting a revision
   *  would demand a confirmation the operator could never clear. Any failure
   *  — the scan's own, or one it does not own — is reported as `scanIncomplete`
   *  rather than "nothing references it". */
  private async checkLiveReferences(id: string): Promise<LiveReferenceCheck> {
    try {
      const referrers = await this.findLiveReferrers!(id, { includeRevisions: false });
      return { referrers, scanIncomplete: false };
    } catch {
      return { referrers: [], scanIncomplete: true };
    }
  }

  /** Records the archive with what the reference check found, so the trail
   *  shows exactly what the operator acknowledged (or that nothing could be
   *  checked) rather than a bare "archived". */
  private async writeArchiveAudit(
    asset: MediaAssetDocument,
    archivedBy: Types.ObjectId,
    referrers: MediaAssetReferrer[],
    scanIncomplete: boolean,
  ): Promise<void> {
    const action = auditActionFor('DELETE', 'Archive');
    if (!action) {
      return;
    }
    await this.auditLogsService!.write({
      actorId: archivedBy,
      action,
      entityType: 'mediaAssets',
      entityId: asset._id as Types.ObjectId,
      ipAddress: '',
      userAgent: '',
      previousValue: null,
      newValue: { referrersCount: referrers.length, referrers, scanIncomplete },
      reason:
        referrers.length > 0
          ? `Archived while still referenced in ${referrers.length} place(s); acknowledged.`
          : scanIncomplete
            ? 'Archived; the reference check could not complete and was acknowledged.'
            : 'Archived with no live references found.',
    });
  }

  /** Removes a photo from its album without archiving it: the file stays live
   *  and keeps showing wherever else it is used. For a photo still referenced
   *  outside the album it is leaving, or one the check could not clear — see
   *  `AlbumsService.removePhoto` (owner D3). The album's own `assetCount` is
   *  the caller's to adjust, unlike `remove()`, which owns it end to end. */
  async detachFromAlbum(id: string): Promise<MediaAssetDocument | null> {
    return this.repository.updateById(id, { albumId: null });
  }

  /** The inverse of `remove`, down to the album's count: a photo that comes back
   *  is in its album's grid again. Same once-only rule. */
  async unarchive(id: string): Promise<MediaAssetDocument | null> {
    const restored = await this.repository.restoreIfArchived(id);
    if (restored?.albumId) {
      await this.albumModel.updateOne({ _id: restored.albumId }, { $inc: { assetCount: 1 } }).exec();
    }
    return restored ?? this.repository.findIncludingArchived(id);
  }

  /** The individual public album page's photo grid: visible assets only,
   *  in display order, mapped to their public-safe shape (2026-09-04
   *  follow-on to ADR-0054). */
  async findPublicByAlbum(albumId: Types.ObjectId): Promise<MediaAssetPublicResponseDto[]> {
    const assets = await this.repository.findVisibleByAlbum(albumId);
    return assets.map((asset) => this.toPublicResponse(asset));
  }

  /**
   * Resolves media ids for the public site.
   *
   * Every one of the twelve public pages carries a `heroImageId` and the CMS
   * offers a picker for it, but every route on this controller required
   * `mediaAssets:Read` — so the public site could store the reference and
   * never render the image. Recorded as an API gap in ADR-0060 §7; approved
   * by the Product Owner on 2026-09-09.
   *
   * Batch rather than one-at-a-time because a single page references a hero
   * plus several section images, and N round trips on a server-rendered page
   * is N times the latency before first paint.
   *
   * Malformed ids are dropped rather than rejected: this endpoint is
   * reachable by anyone, so a bad id is an ordinary event, and a stale
   * reference left in a CMS field must not turn a visitor's page into a 500.
   */
  async findPublicByIds(ids: readonly string[]): Promise<MediaAssetPublicResponseDto[]> {
    const valid = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .slice(0, MediaAssetsService.PUBLIC_ID_LIMIT)
      .map((id) => new Types.ObjectId(id));
    if (valid.length === 0) {
      return [];
    }
    const assets = await this.repository.findVisibleByIds(valid);
    return assets.map((asset) => this.toPublicResponse(asset));
  }

  /**
   * Every image a page record points at, resolved in one query and keyed by
   * id, in the shape a public page draws (ADR-0070 D3). Empty refs are
   * skipped, and an image two fields share is asked for once.
   */
  async resolvePublicImages(ids: readonly unknown[]): Promise<Map<string, PublicImageDto>> {
    const wanted = [...new Set(ids.filter(Boolean).map(String))];
    if (wanted.length === 0) {
      return new Map();
    }

    const assets = await this.findPublicByIds(wanted);

    return new Map(
      assets.map((asset) => [
        asset.id,
        { url: asset.file.url, altText: asset.altText, width: asset.file.width, height: asset.file.height },
      ]),
    );
  }

  /** Maps a full `MediaAsset` document to its public-safe shape (excludes
   *  `albumId`, `isVisible`, and the internal `originalName`/`storageKey`/
   *  `checksum` file fields). */
  toPublicResponse(asset: MediaAssetDocument): MediaAssetPublicResponseDto {
    return {
      id: asset._id.toString(),
      file: {
        url: asset.file.url,
        mimeType: asset.file.mimeType,
        width: asset.file.width,
        height: asset.file.height,
        size: asset.file.size,
        photographer: asset.file.photographer,
        captureDate: asset.file.captureDate,
      },
      caption: asset.caption,
      altText: asset.altText,
      displayOrder: asset.displayOrder,
      isFeatured: asset.isFeatured,
    };
  }
}
