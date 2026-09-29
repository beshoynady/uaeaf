import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BaseRepository } from '../../../common/repositories/base.repository.js';
import { Season } from './schemas/season.schema.js';
import type { SeasonDocument } from './schemas/season.schema.js';
import type { DayRange } from '../../../common/utils/dubai-day-range.util.js';

/**
 * What a visitor may see: published, not soft-deleted — the same
 * `publicationState`/`archivedAt` shape `albums.repository.ts`'s `PUBLISHED`
 * uses — plus `isVisible: true`, the one gate `albums`/`videos` have no
 * field for. It is what `SeasonsService.remove()`'s refusal points an editor
 * at instead of deleting: hiding a referenced season clears it from every
 * public read without touching the content that still points at it.
 */
export const PUBLISHED_SEASON = { publicationState: 'Published', isVisible: true, archivedAt: null } as const;

/** Thrown inside `setCurrent`'s transaction only, to abort it when the target
 *  id does not resolve — never leaves this file. */
class SeasonNotFoundInTransaction extends Error {}

/** Implements: `seasons` collection, Domain 5 — Media Center. */
@Injectable()
export class SeasonsRepository extends BaseRepository<SeasonDocument> {
  constructor(@InjectModel(Season.name) model: Model<SeasonDocument>) {
    super(model);
  }

  async findBySlug(slug: string): Promise<SeasonDocument | null> {
    return this.findOne({ slug });
  }

  async findCurrent(): Promise<SeasonDocument | null> {
    return this.findOne({ isCurrent: true });
  }

  /** The public routing lookup: only a season a visitor may see resolves —
   *  matching `AlbumsRepository.findPublishedBySlug`'s convention. */
  async findPublicBySlug(slug: string): Promise<SeasonDocument | null> {
    return this.findOne({ slug, ...PUBLISHED_SEASON });
  }

  /** The public archive: every season a visitor may see, most recently
   *  started first. */
  async listPublic(): Promise<SeasonDocument[]> {
    return this.model.find(PUBLISHED_SEASON).sort({ startDate: -1 }).exec();
  }

  /** The current season, restricted to what a visitor may see — `null` when
   *  the current season is a Draft or hidden, not only when none is marked. */
  async findPublicCurrent(): Promise<SeasonDocument | null> {
    return this.findOne({ isCurrent: true, ...PUBLISHED_SEASON });
  }

  /** Every live season, most recently started first — the archive and
   *  admin listing order. */
  async listOrdered(): Promise<SeasonDocument[]> {
    return this.model.find({ archivedAt: null }).sort({ startDate: -1 }).exec();
  }

  /**
   * Live seasons sharing at least one Dubai calendar day with `range`.
   *
   * A stored season covers `dubaiDayRange(startDate, endDate)`. `range` comes
   * from the same helper, so both its ends are Dubai day boundaries, and
   * against a day boundary a stored day compares exactly as its raw instant
   * does: the season's first day begins before `range.to` exactly when
   * `startDate < range.to`, and its last day ends after `range.from` exactly
   * when `endDate >= range.from`. The query stays on the indexed fields.
   *
   * Two seasons meeting at a day boundary — one ending on 31 August, the next
   * starting on 1 September — do not overlap; two naming the same day do.
   *
   * `excludeId` lets an update check against every OTHER season without
   * colliding with itself.
   */
  async findOverlapping(range: DayRange, excludeId?: string): Promise<SeasonDocument[]> {
    return this.model
      .find({
        archivedAt: null,
        startDate: { $lt: range.to },
        endDate: { $gte: range.from },
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .exec();
  }

  /**
   * Makes one season current, clearing whoever held it before — in a single
   * transaction, so no external reader ever observes zero or two current
   * seasons.
   *
   * Backed as well by the schema's partial unique index on `isCurrent`
   * (belt and suspenders): the transaction is what keeps the change
   * observable as one atomic step, the index is what refuses a second
   * holder even if this method is ever bypassed.
   *
   * `null` when `id` does not resolve to a live season — the clear is rolled
   * back with it, so a bad id never leaves every season without a current
   * one.
   */
  async setCurrent(id: string): Promise<SeasonDocument | null> {
    const session = await this.model.startSession();
    try {
      return await session.withTransaction(async () => {
        await this.model.updateMany({ isCurrent: true }, { isCurrent: false }, { session });
        const updated = await this.model.findOneAndUpdate(
          { _id: id, archivedAt: null },
          { isCurrent: true },
          { returnDocument: 'after', session },
        );
        if (!updated) {
          throw new SeasonNotFoundInTransaction();
        }
        return updated;
      });
    } catch (error) {
      if (error instanceof SeasonNotFoundInTransaction) {
        return null;
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }
}
