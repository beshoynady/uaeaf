import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { AboutFederationPagesRepository } from './about-federation-page.repository.js';
import type { AboutFederationPageDocument } from './schemas/about-federation-page.schema.js';
import { UpdateAboutFederationPageDto } from './dto/update-about-federation-page.dto.js';
import { AboutFederationStatsService } from './about-federation-stats.service.js';
import { projectAboutPage } from './about-public-projection.js';
import type { AboutPublicPage } from './about-public-projection.js';
import { attachImages, collectImageIds } from './about-images.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { FederationAppointmentsService } from '../federation-appointments/federation-appointments.service.js';
import { toPageSeo } from '../../../common/dto/page-seo.dto.js';

const ENTITY_TYPE = 'aboutFederationPage' as const;

/** The sections whose body is a list an editor reorders and hides item by
 *  item, and the key that list is held under. */
const LIST_SECTIONS = [
  ['facts', 'items'],
  ['timeline', 'items'],
  ['achievements', 'items'],
  ['pioneers', 'items'],
  ['governance', 'cards'],
] as const;

/** What every list item DTO has in common. */
type ListItemInput = { _id?: unknown; isVisible?: boolean };

const ref = (id: string | null | undefined): Types.ObjectId | null => (id ? new Types.ObjectId(id) : null);

/** A stored row as data. A hydrated document's subdocuments carry Mongoose
 *  internals; spreading one copies those rather than the item's fields. */
const plain = (row: object): Record<string, unknown> =>
  'toObject' in row && typeof row.toObject === 'function'
    ? (row.toObject() as Record<string, unknown>)
    : (row as Record<string, unknown>);

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {};

/**
 * The list as it will be stored.
 *
 * An item keeps its id when the stored list already holds it, and is
 * otherwise new — a stale or foreign id is never adopted, so two items can
 * never end up sharing one. Compared as strings because one side is the
 * request's text and the other a stored ObjectId.
 *
 * `displayOrder` is renumbered from the array position rather than taken from
 * the client: the array order is the order the editor set by dragging, and a
 * client's own numbers may repeat or skip, which would leave the public sort
 * breaking ties by storage order.
 */
const normaliseList = (
  incoming: readonly ListItemInput[],
  current: readonly { _id?: unknown }[],
): Record<string, unknown>[] => {
  const known = new Set(current.map((item) => String(item._id)));
  return incoming.map(({ _id, isVisible, ...rest }, index) => ({
    ...rest,
    _id: _id && known.has(String(_id)) ? new Types.ObjectId(String(_id)) : new Types.ObjectId(),
    isVisible: isVisible ?? true,
    displayOrder: index + 1,
  }));
};

/**
 * Implements: aboutFederationPage collection, Domain 1 — Federation &
 * Governance.
 *
 * Workflow-governed (List A + List B): saved as a draft here, published
 * through `PublishingService`, exactly as the Strategic Plan and Vision &
 * Mission pages are. `isActive` is the one thing that does not go that way —
 * see `setActive`.
 */
@Injectable()
export class AboutFederationPagesService {
  constructor(
    private readonly repository: AboutFederationPagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly statsService: AboutFederationStatsService,
    private readonly appointmentsService: FederationAppointmentsService,
  ) {}

  async findAll(): Promise<AboutFederationPageDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AboutFederationPageDocument | null> {
    return this.repository.findById(id);
  }

  /** The row as the dashboard edits it: the whole draft, hidden items and
   *  all, with the activation switch that no ordinary read returns. */
  async findForEditing(id: string): Promise<AboutFederationPageDocument> {
    const record = await this.repository.findByIdWithActivation(id);
    if (!record) {
      throw new NotFoundException('About page not found.');
    }
    return record;
  }

  /**
   * Saves the draft. Never changes `publicationState`, and never moves
   * anything to the public site.
   *
   * A partial body: a section the request leaves out is untouched, and a
   * section it names is merged field by field, so saving one section cannot
   * blank another. A list the request carries replaces the stored list.
   */
  async update(
    id: string,
    dto: UpdateAboutFederationPageDto,
    updatedBy: Types.ObjectId,
  ): Promise<AboutFederationPageDocument> {
    await this.assertUsableImages(dto);

    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('About page not found.');
    }

    const stored = plain(current);
    const set: Record<string, unknown> = { updatedBy };

    if (dto.hiddenSections !== undefined) {
      set.hiddenSections = dto.hiddenSections;
    }
    if (dto.seo !== undefined) {
      set.seo = dto.seo ? toPageSeo(dto.seo) : null;
    }

    for (const key of ['hero', 'story', 'facts', 'timeline', 'achievements', 'pioneers', 'leadership', 'governance', 'ecosystem', 'cta'] as const) {
      const incoming = dto[key];
      if (incoming === undefined) {
        continue;
      }
      set[key] = this.mergeSection(key, incoming as Record<string, unknown>, asRecord(stored[key]));
    }

    const updated = await this.repository.updateById(id, { $set: set } as UpdateQuery<AboutFederationPageDocument>);
    if (!updated) {
      throw new NotFoundException('About page not found.');
    }
    return updated;
  }

  /**
   * Switches the finished page on or off for visitors.
   *
   * Deliberately not part of a draft save and not part of the review cycle.
   * Taking a live page down is an operational act with its own urgency — it
   * must not wait for an approval — and putting one up is the moment the
   * federation chooses, after the content has already been approved. It is
   * gated on Publish rather than Update for exactly that reason: it is a
   * publishing decision, not an editing one.
   *
   * The returned document carries `_id`, which is what makes the change
   * appear in the audit log (`audit-log.interceptor.ts` records a write only
   * when it can name the record).
   */
  async setActive(
    id: string,
    isActive: boolean,
    updatedBy: Types.ObjectId,
  ): Promise<AboutFederationPageDocument> {
    const updated = await this.repository.updateById(id, {
      $set: { isActive, updatedBy },
    } as UpdateQuery<AboutFederationPageDocument>);

    if (!updated) {
      throw new NotFoundException('About page not found.');
    }
    return updated;
  }

  /** The page at `/about`: the newest Live publication, or `null` when the
   *  federation has never published one. */
  async getCurrentPublic(): Promise<AboutPublicPage | null> {
    const records = await this.repository.find();

    const candidates = await Promise.all(
      records.map(async (record) => {
        const id = record._id as Types.ObjectId;
        const live = await this.liveVersion(id);
        return live ? { ...live, id } : null;
      }),
    );

    const live = candidates
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];

    return live ? this.toPublicResponse(live.id, live.snapshot, live.publishedAt) : null;
  }

  /** Reads through `publications → revisions.snapshotData`, never this
   *  collection's own row. `null` when nothing of this row is Live. */
  async getPublicSnapshot(id: string): Promise<AboutPublicPage | null> {
    const entityId = new Types.ObjectId(id);
    const live = await this.liveVersion(entityId);
    return live ? this.toPublicResponse(entityId, live.snapshot, live.publishedAt) : null;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AboutFederationPageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /**
   * Merges one section's incoming fields over the stored ones.
   *
   * Field by field rather than wholesale: the dashboard saves the section the
   * editor has open, and a whole-object replace would blank every field that
   * screen does not draw. The section's list, where it has one, is the
   * exception — a list sent is the list, because that is how removal is
   * expressed.
   */
  private mergeSection(
    key: string,
    incoming: Record<string, unknown>,
    stored: Record<string, unknown>,
  ): Record<string, unknown> {
    const listKey = LIST_SECTIONS.find(([section]) => section === key)?.[1];
    const merged: Record<string, unknown> = { ...stored };

    for (const [field, value] of Object.entries(incoming)) {
      if (field === listKey) {
        const current = Array.isArray(stored[listKey]) ? (stored[listKey] as { _id?: unknown }[]) : [];
        merged[listKey] = normaliseList((value ?? []) as ListItemInput[], current);
        continue;
      }
      if (field === 'imageId' || field === 'ogImageId') {
        merged[field] = ref(value as string | null | undefined);
        continue;
      }
      merged[field] = value;
    }

    return merged;
  }

  /** A row's Live snapshot with the time it went Live, or `null`. */
  private async liveVersion(
    entityId: Types.ObjectId,
  ): Promise<{ snapshot: Record<string, unknown>; publishedAt: Date } | null> {
    const publication = await this.publicationsService.findLive(ENTITY_TYPE, entityId);
    if (!publication) {
      return null;
    }
    const snapshot = await this.publicationsService.getPublicSnapshot(ENTITY_TYPE, entityId);
    return snapshot ? { snapshot, publishedAt: publication.publishedAt } : null;
  }

  /**
   * Builds what a visitor receives.
   *
   * `isActive` is read from the live row rather than the snapshot, because it
   * is deliberately never frozen into one (see the schema). So the switch
   * reflects the federation's decision right now, while the words reflect the
   * version they approved.
   */
  private async toPublicResponse(
    entityId: Types.ObjectId,
    snapshot: Record<string, unknown>,
    publishedAt: Date,
  ): Promise<AboutPublicPage> {
    const record = await this.repository.findByIdWithActivation(entityId.toString());
    const isActive = record?.isActive === true;

    if (!isActive) {
      return { isActive: false };
    }

    const [counts, leaders] = await Promise.all([
      this.statsService.counts(),
      this.appointmentsService.currentLeadership(),
    ]);

    const page = projectAboutPage(snapshot, { isActive, counts, leaders, publishedAt });
    const images = await this.mediaAssetsService.resolvePublicImages(
      collectImageIds(page as unknown as Record<string, unknown>),
    );

    return attachImages(page as unknown as Record<string, unknown>, images) as unknown as AboutPublicPage;
  }

  /** Every picture the body names must exist and be an image, checked before
   *  anything is written — a save that half-applies is worse than one that
   *  refuses. */
  private async assertUsableImages(dto: UpdateAboutFederationPageDto): Promise<void> {
    const ids = collectImageIds(dto as unknown as Record<string, unknown>);
    const ogImageId = dto.seo?.ogImageId;
    for (const id of ogImageId ? [...ids, ogImageId] : ids) {
      await this.mediaAssetsService.assertUsableImage(id);
    }
  }
}
