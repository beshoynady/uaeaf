import { Model, Types } from 'mongoose';
import type { QueryFilter, UpdateQuery } from 'mongoose';

/**
 * Soft-delete-aware CRUD for a schema extending BaseSchema. HardDelete is
 * deliberately not exposed here — it is a separate, more privileged
 * operation (see `permissions.action`, BE-PLAN-010 §4.4) that a domain
 * repository opts into explicitly with its own named method, never inherited
 * for free.
 */
export abstract class BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  async findById(id: string): Promise<T | null> {
    return this.model.findOne({ _id: id, archivedAt: null } as QueryFilter<T>).exec();
  }

  /** Batched sibling of `findById`, honouring the same soft-delete scope.
   *  Exists because permission resolution moved from login time to every
   *  request (owner decision 2026-09-07): resolving a Super Admin's 164
   *  permissions one findById at a time cost 165 round trips, which was
   *  tolerable once per 15 minutes and is not tolerable per request.
   *
   *  Returns fewer documents than ids given when some are missing or
   *  archived — callers must treat absence as "grants nothing", never as
   *  an error, so one stale id cannot fail an otherwise valid request. */
  async findByIds(ids: readonly string[]): Promise<T[]> {
    if (ids.length === 0) {
      // Short-circuited rather than sent as `$in: []`: a user with no roles
      // is the common case on a fresh account, and it needs no query at all.
      return [];
    }
    return this.model.find({ _id: { $in: ids }, archivedAt: null } as QueryFilter<T>).exec();
  }

  async findOne(filter: QueryFilter<T> = {}): Promise<T | null> {
    return this.model.findOne({ ...filter, archivedAt: null } as QueryFilter<T>).exec();
  }

  async find(filter: QueryFilter<T> = {}): Promise<T[]> {
    return this.model.find({ ...filter, archivedAt: null } as QueryFilter<T>).exec();
  }

  /**
   * The one row, with `isActive` asked for by name.
   *
   * A method of its own rather than widening `findOne`, because the exclusion is
   * the point. `isActive` is `select: false` on the shared hero schema so that
   * `RevisionsService.snapshotOf` cannot freeze it and `PublishingService.restore`
   * cannot write it back — widening the ordinary read would undo that for every
   * caller at once (ADR-0102 §D4). Only the two readers that genuinely need it
   * come here: the public read, which decides whether to serve the page, and the
   * dashboard, which draws the switch.
   *
   * Harmless on a schema with no such field: `select('+isActive')` on a path
   * that does not exist selects nothing.
   */
  async findOneWithActivation(filter: QueryFilter<T> = {}): Promise<T | null> {
    return this.model
      .findOne({ ...filter, archivedAt: null } as QueryFilter<T>)
      .select('+isActive')
      .exec();
  }

  /**
   * Updates the one row this collection holds and answers it, in a single
   * statement, with `isActive` selected.
   *
   * One round trip rather than a read followed by a write, and atomic: between
   * a separate read and write another request can archive the row, and the
   * write would then resurrect a field on a deleted page. `null` when there is
   * no row — which is a real answer here, not an error: a page that has never
   * been saved cannot be switched.
   */
  async updateOneWithActivation(update: UpdateQuery<T>): Promise<T | null> {
    return this.model
      .findOneAndUpdate({ archivedAt: null } as QueryFilter<T>, update, { returnDocument: 'after' })
      .select('+isActive')
      .exec();
  }

  /** One named row with `isActive` asked for by name — the by-id sibling of
   *  `findOneWithActivation`, for the collections that hold more than one row.
   *  Same reasoning: see that method. */
  async findByIdWithActivation(id: string): Promise<T | null> {
    return this.findOneWithActivation({ _id: id } as QueryFilter<T>);
  }

  /** Every row with `isActive` asked for by name — the admin listing, which
   *  draws each page's live state beside the row it opens.
   *
   *  Safe to widen here: `RevisionsService` takes its snapshot through its own
   *  model lookup rather than this repository, so what these three methods
   *  select cannot reach a frozen revision. */
  async findAllWithActivation(filter: QueryFilter<T> = {}): Promise<T[]> {
    return this.model
      .find({ ...filter, archivedAt: null } as QueryFilter<T>)
      .select('+isActive')
      .exec();
  }

  /** DB-level skip/limit plus the matching total — not an in-memory slice
   *  of `find()` — so a paginated listing scales past what fits in memory.
   *  Shared by every paginated public listing rather than reimplemented
   *  per repository. */
  async findPaginated(
    skip: number,
    limit: number,
    filter: QueryFilter<T> = {},
  ): Promise<{ items: T[]; total: number }> {
    const scoped = { ...filter, archivedAt: null } as QueryFilter<T>;
    const [items, total] = await Promise.all([
      this.model.find(scoped).skip(skip).limit(limit).exec(),
      this.model.countDocuments(scoped).exec(),
    ]);
    return { items, total };
  }

  async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  async updateById(id: string, update: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, update, { returnDocument: 'after' }).exec();
  }

  async softDelete(id: string, archivedBy: Types.ObjectId): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, { archivedAt: new Date(), archivedBy }, { returnDocument: 'after' })
      .exec();
  }
}
