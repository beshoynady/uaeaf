import {
  Inject,
  Injectable,
  NotFoundException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { MediaAssetsRepository } from './media-assets.repository.js';
import { STORAGE_PROVIDER, type StorageProvider } from '../storage/storage-provider.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { auditActionFor } from '../../workflow/audit-logs/audit-action.util.js';
import type { AuditAction } from '../../workflow/audit-logs/schemas/audit-log.schema.js';
import type { WriteAuditLogInput } from '../../workflow/audit-logs/dto/write-audit-log.dto.js';
import {
  MediaReferenceCheckFailedError,
  SCANNED_COLLECTIONS,
  type MediaAssetReferrer,
} from '../../../common/authz/media-references.js';
import {
  assertArchivedFirst,
  STEP_UP_VERIFIER,
  type StepUpVerifier,
} from '../../../common/authz/archive-restore.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * Everything that still points at one asset.
 *
 * Injected rather than imported so the purge can be exercised without a
 * database — and so the scan's `ignore` option has no parameter to reach it
 * through: the factory in `media-assets.module.ts` closes over the connection
 * and passes nothing else, which is what keeps a caller from suppressing the
 * very referrer that would refuse their deletion.
 */
export type MediaAssetReferrerScan = (id: string) => Promise<MediaAssetReferrer[]>;

/** Injection token for `MediaAssetReferrerScan`. */
export const MEDIA_ASSET_REFERRER_SCAN = Symbol('MEDIA_ASSET_REFERRER_SCAN');

/**
 * The one irreversible destruction on this platform: the stored object is
 * destroyed and the record is removed for good.
 *
 * A service of its own rather than another method on `MediaAssetsService`
 * because it is the only operation here that needs the storage provider, the
 * reference scan and the audit trail together, and because an act nothing can
 * undo is worth reading in one short file.
 *
 * The four conditions it enforces, and what the owner refused, are in ADR-0120.
 * All four are checked here rather than at the route, because this service is
 * exported and a caller that does not go through a route would skip anything a
 * controller checked.
 */
@Injectable()
export class MediaAssetPurgeService {
  constructor(
    private readonly repository: MediaAssetsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(MEDIA_ASSET_REFERRER_SCAN) private readonly findReferrers: MediaAssetReferrerScan,
    @Inject(STEP_UP_VERIFIER) private readonly stepUp: StepUpVerifier,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Destroys the stored object, then removes the record.
   *
   * @throws ForbiddenException when step-up verification cannot be presented —
   *   which is every caller today, so nothing below it is reachable over HTTP.
   * @throws NotFoundException when `id` references nothing.
   * @throws ConflictException when the asset is still live, or something still
   *   references it — the refusal carries the referrers, each with its kind.
   * @throws ServiceUnavailableException when the reference check could not
   *   complete. Nothing is destroyed on that path.
   */
  permanentDelete = async (
    id: string,
    actor: AuthenticatedUser,
    context: { ipAddress?: string; userAgent?: string } = {},
  ): Promise<void> => {
    await this.stepUp.assertVerified(`MediaAsset ${id}`);

    const asset = await this.repository.findIncludingArchived(id);
    if (!asset) {
      throw new NotFoundException(`MediaAsset ${id} not found.`);
    }
    assertArchivedFirst(asset, `MediaAsset ${id}`);

    const referrers = await this.referrersOf(id);
    if (referrers.length > 0) {
      throw new ConflictException({
        code: 'stillReferenced',
        message: `MediaAsset ${id} is still referenced in ${referrers.length} place(s). Remove those references first.`,
        referrers,
      });
    }

    const subject = {
      actorId: new Types.ObjectId(actor.userId),
      action: this.auditAction(),
      entityType: 'mediaAssets',
      entityId: asset._id as Types.ObjectId,
      ipAddress: context.ipAddress ?? '',
      userAgent: context.userAgent ?? '',
      previousValue: null,
      newValue: {
        storageKey: asset.file.storageKey,
        originalName: asset.file.originalName,
        referencesChecked: SCANNED_COLLECTIONS.length,
        referrersFound: referrers.length,
      },
    };

    // Recorded before anything is destroyed: written afterwards, a failing audit
    // write would leave an irreversible deletion with no trace and a 500 saying
    // nothing happened. The log is append-only, so an outcome that differs from
    // this intent is a second row, never an edit to this one.
    await this.auditLogsService.write({
      ...subject,
      reason: 'Permanent delete authorised; destroying the stored object',
    });

    // Storage first: reversed, a provider failure would leave an object nothing
    // points at, consuming quota unseen. A row whose file is gone is visible and
    // fixable; a file no row names is neither.
    await this.recordFailure(subject, 'Storage refused the destroy; the record was kept', () =>
      this.storage.destroy(asset.file.storageKey),
    );
    await this.recordFailure(
      subject,
      'The object was destroyed and the record could not be removed',
      () => this.repository.hardDelete(id),
    );
  };

  /** Derived from this route's own (method, permission) pair, never typed in:
   *  the two must agree, and `audit-action-literal-scan.spec.ts` forbids the
   *  literal that let them drift once already. */
  private auditAction = (): AuditAction => {
    const action = auditActionFor('DELETE', 'PermanentDelete');
    if (!action) {
      throw new Error('No audit action for DELETE PermanentDelete.');
    }
    return action;
  };

  /** Runs a step of the destruction and, if it fails, appends a row saying which
   *  step and rethrows. The failure the log must never carry is the silent one. */
  private recordFailure = async (
    subject: Omit<WriteAuditLogInput, 'reason'>,
    reason: string,
    step: () => Promise<unknown>,
  ): Promise<void> => {
    try {
      await step();
    } catch (cause) {
      await this.auditLogsService.write({ ...subject, reason });
      throw cause;
    }
  };

  /**
   * The reference check, fail-closed.
   *
   * Every failure refuses, including one the scan does not own — a `TypeError`,
   * a driver throw from outside its own guards. Catching only
   * `MediaReferenceCheckFailedError` is how "the check failed" turns into
   * "nothing references it", in front of an irreversible destruction.
   */
  private referrersOf = async (id: string): Promise<MediaAssetReferrer[]> => {
    try {
      return await this.findReferrers(id);
    } catch (cause) {
      throw new ServiceUnavailableException({
        code: 'referenceCheckFailed',
        message: 'The reference check could not complete, so the file was not deleted.',
        unchecked: cause instanceof MediaReferenceCheckFailedError ? cause.unchecked : [],
      });
    }
  };
}
