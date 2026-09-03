import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { BaseRepository } from '../repositories/base.repository.js';

/**
 * Structural enforcement of the CMS singleton rule (confirmed decision #8,
 * 2026-09-03): `siteSettings` and the hero-wrapper `*Page` collections
 * must hold at most one document each.
 *
 * Enforced here in the service layer rather than left to convention:
 * `upsert()` never inserts a second row — it updates the existing one when
 * present. There is deliberately no `create()`; a caller that wants "make
 * or update the one row" has exactly one method to reach for.
 *
 * Not applied to `visionMissionPage`/`strategicPlansPage`/
 * `aboutFederationPage`/`presidentMessagePage`: those are workflow-governed
 * editorial content rather than hero wrappers, and `strategicPlansPage`
 * in particular carries `periodStart`/`periodEnd`/`documentVersion`, which
 * suggests successive plan periods may legitimately coexist. The live board
 * states no singleton constraint for them, so none is invented here —
 * flagged rather than assumed.
 */
export abstract class SingletonPageService<TDoc> {
  protected constructor(protected readonly repository: BaseRepository<TDoc>) {}

  /** The single row for this collection, or `null` before it is first set. */
  async get(): Promise<TDoc | null> {
    return this.repository.findOne();
  }

  /** Creates the row when absent, otherwise updates the existing one. */
  protected async upsertDocument(data: Partial<TDoc>): Promise<TDoc> {
    const existing = await this.repository.findOne();
    if (!existing) {
      return this.repository.create(data);
    }
    const id = (existing as unknown as { _id: Types.ObjectId })._id.toString();
    const updated = await this.repository.updateById(id, data as UpdateQuery<TDoc>);
    return updated ?? existing;
  }
}
