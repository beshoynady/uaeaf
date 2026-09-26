import { NotFoundException } from '@nestjs/common';
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
 * editorial content rather than hero wrappers, and each page's public route
 * picks the newest Live publication among its rows. The live board states
 * no singleton constraint for them, so none is invented here — flagged
 * rather than assumed.
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

/**
 * The singleton pages that can be taken off the site — the twelve hero
 * wrappers (ADR-0102 §D2).
 *
 * A subclass rather than two more methods on `SingletonPageService`, because
 * `siteSettings` shares that base and is **not** a page: it is maintenance
 * mode, analytics ids and session timeouts, it carries no `isActive`, and it has
 * no URL to be withheld from. Putting the switch on the shared base would have
 * given platform configuration a control that means nothing there — the same
 * merge-because-the-shape-matches that `static-pages.ts` refuses for the same
 * collection.
 *
 * So the split follows the schema: the field lives on `HeroPageSchema`, and so
 * does its service.
 */
export abstract class ActivatableSingletonPageService<TDoc> extends SingletonPageService<TDoc> {
  /** The single row, carrying `isActive` — which `select: false` keeps out of
   *  every other read (ADR-0102 §D4). Both callers need it: the public read
   *  decides whether to serve the page at all, and the dashboard draws the
   *  switch. */
  override async get(): Promise<TDoc | null> {
    return this.repository.findOneWithActivation();
  }

  /**
   * Switches the page on or off for visitors, at once.
   *
   * Three things make this unlike `upsert`, each deliberate (ADR-0102 §D2):
   *
   * - It does not go through any review. Taking a live page down is an
   *   operational act that cannot wait for an approval, and putting one up is a
   *   decision taken after the words were already approved.
   * - Its route is gated on `Publish`, not `Update`. Deciding what the public
   *   sees is a publishing decision; an editor who may rewrite the page still may
   *   not decide the moment it appears.
   * - It writes nothing but the switch and who threw it, so it cannot become a
   *   way to change the page's content without going through the ordinary save.
   *
   * It refuses rather than upserting when there is no row. Creating one to hold a
   * switch would put a page with no title and no subtitle on the site, which is
   * the opposite of what the caller asked for.
   *
   * The returned document carries `_id`, which the audit-log interceptor needs to
   * record the write at all — a response without one leaves the change
   * untraceable.
   */
  async setActive(isActive: boolean, updatedBy: Types.ObjectId): Promise<TDoc> {
    // One statement, not a read then a write: between the two, another request
    // can archive the row, and the write would resurrect a field on a page that
    // is gone.
    const updated = await this.repository.updateOneWithActivation({
      $set: { isActive, updatedBy },
    } as UpdateQuery<TDoc>);

    if (!updated) {
      throw new NotFoundException('This page has not been saved yet, so it cannot be switched.');
    }
    return updated;
  }
}
