import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { StrategicPlansPagesRepository } from './strategic-plans-page.repository.js';
import type { StrategicPlansPageDocument } from './schemas/strategic-plans-page.schema.js';
import { CreateStrategicPlansPageDto } from './dto/create-strategic-plans-page.dto.js';
import { UpdateStrategicPlansPageDto } from './dto/update-strategic-plans-page.dto.js';
import type {
  PublicPlanItemDto,
  PublicPlanMetricDto,
  PublicPlanPhaseDto,
  PublicPlanStepDto,
  StrategicPlanPublicResponseDto,
} from './dto/strategic-plan-public-response.dto.js';
import { WITHHELD_PAGE, type WithheldPageDto } from '../../../common/dto/withheld-page.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { MAX_PLAN_ROW_ITEMS, PLAN_ROW_LIST_KEYS } from '../../../common/constants/plan-row-limit.js';
import { toPageSeo } from '../../../common/dto/page-seo.dto.js';
import type { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

const ENTITY_TYPE = 'strategicPlansPage' as const;

/** The five embedded lists an editor reorders and hides item by item. */
export const PLAN_LIST_KEYS = ['phases', 'pillars', 'objectives', 'metrics', 'executionSteps'] as const;

export type PlanListKey = (typeof PLAN_LIST_KEYS)[number];

/** The content fields a save copies as sent. The image refs, `seo` and the
 *  lists are converted on the way in, so they are handled apart. */
const TEXT_KEYS = [
  'heroTitle',
  'heroSubtitle',
  'introHeading',
  'introText',
  'phasesTitle',
  'pillarsTitle',
  'pillarsText',
  'objectivesTitle',
  'metricsTitle',
  'executionTitle',
  'executionText',
  'ctaTitle',
  'ctaText',
] as const;

/** Every picture the page prints: content with a field, the section
 *  pictures as much as the hero (owner rule 2026-09-14). */
const IMAGE_KEYS = ['heroImageId', 'introImageId', 'objectivesImageId', 'metricsImageId', 'ctaImageId'] as const;

/** What every list item DTO has in common, and all `normaliseList` reads. */
type ListItemInput = { _id?: unknown; isVisible?: boolean; displayOrder?: number };

type StoredListItem<T extends ListItemInput> = Omit<T, '_id' | 'isVisible'> & {
  _id: Types.ObjectId;
  isVisible: boolean;
};

const ref = (id: string | null | undefined): Types.ObjectId | null => (id ? new Types.ObjectId(id) : null);

const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

/** A stored row as data. A hydrated document's subdocuments carry Mongoose
 *  internals; spreading one copies those, not the item's fields, so the
 *  lists are read from `toObject()` when the row offers it. */
const plain = (row: object): Record<string, unknown> =>
  'toObject' in row && typeof row.toObject === 'function'
    ? (row.toObject() as Record<string, unknown>)
    : (row as Record<string, unknown>);

const byOrder = <T extends { displayOrder: number }>(a: T, b: T): number => a.displayOrder - b.displayOrder;

/** An item prints unless the editor hid it; a row saved before the flag
 *  existed has no flag and stays visible. */
const visible = (item: { isVisible?: unknown }): boolean => item.isVisible !== false;

/**
 * The list as it will be stored: an item keeps its id when the stored list
 * already holds it, and is otherwise new — a stale or foreign id is never
 * adopted, so two items can never share one. Compared as strings because one
 * side is the request's text and the other the stored ObjectId.
 *
 * `displayOrder` is renumbered from the array position: the array order is
 * the order the editor set, and a client's own numbers may repeat or skip,
 * which would leave the public sort to break ties by storage order.
 */
const normaliseList = <T extends ListItemInput>(
  incoming: readonly T[],
  current: readonly { _id?: unknown }[],
): StoredListItem<T>[] => {
  const known = new Set(current.map((item) => String(item._id)));
  return incoming.map(({ _id, isVisible, ...rest }, index) => ({
    ...rest,
    _id: _id && known.has(String(_id)) ? new Types.ObjectId(String(_id)) : new Types.ObjectId(),
    isVisible: isVisible ?? true,
    displayOrder: index + 1,
  }));
};

/**
 * Refuses a list the request carries with no visible item in it.
 *
 * The page's section order and composition are locked in code (ADR-0075):
 * an editor hides items, never a whole section, and a list with nothing
 * visible prints no section at all. A list the request leaves out keeps what
 * is stored and is not checked here. A `null` list has no visible item.
 *
 * @throws BadRequestException (`listNeedsVisibleItem`).
 */
const assertEverySectionShows = (
  dto: Partial<Record<PlanListKey, readonly ListItemInput[] | null>>,
): void => {
  for (const key of PLAN_LIST_KEYS) {
    const items = dto[key];
    if (items !== undefined && !(Array.isArray(items) && items.some(visible))) {
      throw new BadRequestException({
        code: 'listNeedsVisibleItem',
        message: `Each section keeps at least one visible item: "${key}" has none.`,
        list: key,
      });
    }
  }
};

/**
 * Refuses a list drawn as one row that carries more items than the row holds
 * (ADR-0075, owner decision 2026-09-16).
 *
 * Hidden items count: they occupy the row the moment an editor shows them
 * again, and the stored count is what the next editor opens. A list the
 * request leaves out keeps what is stored and is not checked here. The
 * wrapping lists carry no limit.
 *
 * @throws BadRequestException (`listTooLong`).
 */
const assertRowFits = (dto: Partial<Record<PlanListKey, readonly ListItemInput[] | null>>): void => {
  for (const key of PLAN_ROW_LIST_KEYS) {
    const items = dto[key];
    if (Array.isArray(items) && items.length > MAX_PLAN_ROW_ITEMS) {
      throw new BadRequestException({
        code: 'listTooLong',
        message: `"${key}" stands in one row and holds at most ${MAX_PLAN_ROW_ITEMS} items; ${items.length} were sent.`,
        list: key,
        limit: MAX_PLAN_ROW_ITEMS,
      });
    }
  }
};

/** Implements: strategicPlansPage collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B): saved as a draft here,
 *  published through `PublishingService`, as the Vision & Mission page is. */
@Injectable()
export class StrategicPlansPagesService {
  constructor(
    private readonly repository: StrategicPlansPagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** @throws BadRequestException (`listNeedsVisibleItem`) when a list the
   *  request carries has no visible item, (`listTooLong`) when a list drawn as
   *  one row carries more items than the row holds. */
  async create(dto: CreateStrategicPlansPageDto): Promise<StrategicPlansPageDocument> {
    assertEverySectionShows(dto);
    assertRowFits(dto);
    await this.assertUsableImages(dto);

    return this.repository.create({
      federationId: new Types.ObjectId(dto.federationId),
      heroImageId: ref(dto.heroImageId),
      introImageId: ref(dto.introImageId),
      objectivesImageId: ref(dto.objectivesImageId),
      metricsImageId: ref(dto.metricsImageId),
      ctaImageId: ref(dto.ctaImageId),
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      introHeading: dto.introHeading,
      introText: dto.introText,
      phasesTitle: dto.phasesTitle ?? null,
      phases: normaliseList(dto.phases ?? [], []),
      pillarsTitle: dto.pillarsTitle,
      pillarsText: dto.pillarsText ?? null,
      pillars: normaliseList(dto.pillars ?? [], []),
      objectivesTitle: dto.objectivesTitle,
      objectives: normaliseList(dto.objectives ?? [], []),
      metricsTitle: dto.metricsTitle,
      metrics: normaliseList(dto.metrics ?? [], []),
      executionTitle: dto.executionTitle,
      executionText: dto.executionText ?? null,
      executionSteps: normaliseList(dto.executionSteps ?? [], []),
      ctaTitle: dto.ctaTitle,
      ctaText: dto.ctaText ?? null,
      seo: dto.seo ? toPageSeo(dto.seo) : null,
      revisionId: null,
      publicationState: dto.publicationState,
    } as Partial<StrategicPlansPageDocument>);
  }

  /**
   * Applies only the keys the request actually carried: absent is left alone,
   * `null` clears. `!== undefined` rather than `key in dto`, because every
   * field the DTO class declares exists on the instance under
   * `useDefineForClassFields`.
   *
   * The row is read first because a list item's id is only kept when the
   * stored list holds it (`normaliseList`).
   *
   * @throws BadRequestException (`listNeedsVisibleItem`) when a list the
   *   request carries has no visible item, (`listTooLong`) when a list drawn
   *   as one row carries more items than the row holds.
   * @throws NotFoundException when no live row has that id.
   */
  async update(
    id: string,
    dto: UpdateStrategicPlansPageDto,
    updatedBy: Types.ObjectId,
  ): Promise<StrategicPlansPageDocument> {
    assertEverySectionShows(dto);
    assertRowFits(dto);
    await this.assertUsableImages(dto);

    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('Strategic plan page not found.');
    }

    const set: Record<string, unknown> = { updatedBy };

    for (const key of TEXT_KEYS) {
      if (dto[key] !== undefined) {
        set[key] = dto[key];
      }
    }

    for (const key of IMAGE_KEYS) {
      if (dto[key] !== undefined) {
        set[key] = ref(dto[key]);
      }
    }

    const stored = plain(current);
    for (const key of PLAN_LIST_KEYS) {
      if (dto[key] !== undefined) {
        set[key] = normaliseList(dto[key] as ListItemInput[], list(stored[key]));
      }
    }

    if (dto.seo !== undefined) {
      set.seo = dto.seo ? toPageSeo(dto.seo) : null;
    }

    const updated = await this.repository.updateById(id, {
      $set: set,
    } as UpdateQuery<StrategicPlansPageDocument>);

    if (!updated) {
      throw new NotFoundException('Strategic plan page not found.');
    }

    return updated;
  }

  /**
   * Rewrites one list's `displayOrder` from the ids given, 1 upwards.
   *
   * The ids must be exactly the list's items — every one, once, and no
   * other — so a dashboard holding a stale copy of the list cannot drop or
   * duplicate an item by reordering it. Anything else is refused whole.
   *
   * @throws NotFoundException when no live row has that id.
   * @throws BadRequestException (`invalidListOrder`) when the ids are not a
   *   permutation of the stored list.
   * @throws ConflictException (`staleRecord`) when the row changed, or was
   *   archived, between the read and the write.
   */
  async reorderList(
    id: string,
    listKey: PlanListKey,
    ids: readonly string[],
    updatedBy: Types.ObjectId,
  ): Promise<StrategicPlansPageDocument> {
    const current = await this.repository.findById(id);
    if (!current) {
      throw new NotFoundException('Strategic plan page not found.');
    }

    const stored = plain(current);
    const items = new Map(list(stored[listKey]).map((item) => [String(item._id), item]));
    const distinct = new Set(ids);
    const isPermutation =
      ids.length === items.size && distinct.size === ids.length && ids.every((itemId) => items.has(itemId));

    if (!isPermutation) {
      throw new BadRequestException({
        code: 'invalidListOrder',
        message: `The ids must be every item of "${listKey}" exactly once, in the new order.`,
        expected: [...items.keys()],
      });
    }

    const reordered = ids.map((itemId, index) => ({ ...items.get(itemId), displayOrder: index + 1 }));

    // The list written is a copy of the read above, so it is written only
    // while the row still carries that read's `updatedAt`: a save landing in
    // between would otherwise be overwritten with the older items.
    const updated = await this.repository.updateIfUnchanged(id, stored.updatedAt as Date, {
      $set: { [listKey]: reordered, updatedBy },
    } as UpdateQuery<StrategicPlansPageDocument>);

    if (!updated) {
      throw new ConflictException({
        code: 'staleRecord',
        message: 'This record changed while it was being reordered. Reload it and reorder again.',
      });
    }

    return updated;
  }

  /** The admin listing. Carries `isActive`, which the dashboard draws as the
   *  page's live state beside the row it opens — an ordinary read excludes it
   *  (ADR-0102 §D4). */
  async findAll(): Promise<StrategicPlansPageDocument[]> {
    return this.repository.findAllWithActivation();
  }

  /**
   * Switches the finished page on or off for visitors, at once.
   *
   * Three things make this write unlike every other one here, each deliberate
   * (ADR-0102 §D2):
   *
   * - It does not go through the review cycle. Taking a live page down is an
   *   operational act that cannot wait for an approval, and putting one up is a
   *   decision made after the words were already approved.
   * - Its route is gated on `Publish`, not `Update`. Deciding what the public
   *   sees is a publishing decision; an editor who may rewrite the page still may
   *   not decide the moment it appears.
   * - It is allowed while a review holds the draft. The switch governs the
   *   version already live; a review in progress concerns the next one, and
   *   blocking the switch on it would mean a page could not be taken down
   *   because someone happened to be editing it.
   *
   * It writes nothing but the switch and who threw it, so it cannot become a way
   * to change the page's words without going through the ordinary save. The
   * returned document carries `_id`: the audit-log interceptor records a write
   * only when it can name the record.
   */
  async setActive(
    id: string,
    isActive: boolean,
    updatedBy: Types.ObjectId,
  ): Promise<StrategicPlansPageDocument> {
    const updated = await this.repository.updateById(id, {
      $set: { isActive, updatedBy },
    } as UpdateQuery<StrategicPlansPageDocument>);

    if (!updated) {
      throw new NotFoundException('Strategic plans page not found.');
    }
    return updated;
  }

  async findById(id: string): Promise<StrategicPlansPageDocument | null> {
    return this.repository.findById(id);
  }

  /** One row's public page, read through the publication (Week 2 "Approved ≠
   *  Published" rule) and built by `toPublicResponse` as `getCurrentPublic`
   *  is: the raw snapshot carries `federationId` and the hidden items, and
   *  neither reaches a visitor. `null` when nothing of the row is Live. */
  async getPublicSnapshot(
    id: string,
  ): Promise<StrategicPlanPublicResponseDto | WithheldPageDto | null> {
    const live = await this.liveVersion(new Types.ObjectId(id));
    return live ? this.servedOrWithheld(live) : null;
  }

  /**
   * The page `/about/governance/strategic-plan` shows: the most recently
   * published Live version among the collection's rows.
   *
   * The collection is not singleton-enforced, but it states one federation's
   * plan, so the newest publication is the current plan. Returns `null` —
   * HTTP 200 with a null body — when nothing is Live.
   */
  async getCurrentPublic(): Promise<StrategicPlanPublicResponseDto | WithheldPageDto | null> {
    const records = await this.repository.find();

    const candidates = await Promise.all(
      records.map((record) => this.liveVersion(record._id as Types.ObjectId)),
    );

    const live = candidates
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];

    return live ? this.servedOrWithheld(live) : null;
  }

  /** A row's Live snapshot with the time it went Live, or `null` when the
   *  row has no Live publication. Carries the row's id, because the activation
   *  switch is read from the row and never from the snapshot. */
  private async liveVersion(
    entityId: Types.ObjectId,
  ): Promise<{ entityId: Types.ObjectId; snapshot: Record<string, unknown>; publishedAt: Date } | null> {
    const publication = await this.publicationsService.findLive(ENTITY_TYPE, entityId);
    if (!publication) {
      return null;
    }
    const snapshot = await this.publicationsService.getPublicSnapshot(ENTITY_TYPE, entityId);
    return snapshot ? { entityId, snapshot, publishedAt: publication.publishedAt } : null;
  }

  /**
   * The published page, or the switch alone when the page is switched off.
   *
   * `isActive` is read from the row rather than the snapshot, because it is
   * deliberately never frozen into one (see the schema). So the switch reflects
   * the federation's decision right now, while the words reflect the version
   * they approved.
   *
   * A withheld page answers with the switch and nothing else — not a full
   * response the caller is expected not to render. The draft may be mid-review,
   * so there must be nothing in the body to leak (ADR-0102 §D2).
   */
  private async servedOrWithheld(live: {
    entityId: Types.ObjectId;
    snapshot: Record<string, unknown>;
    publishedAt: Date;
  }): Promise<StrategicPlanPublicResponseDto | WithheldPageDto> {
    const record = await this.repository.findByIdWithActivation(live.entityId.toString());
    if (record?.isActive !== true) {
      return WITHHELD_PAGE;
    }
    return this.toPublicResponse(live.snapshot, live.publishedAt);
  }

  /** Builds the public shape field by field. Anything the snapshot carries
   *  and this method does not name — the hidden items included — does not
   *  reach a visitor. */
  private async toPublicResponse(
    snapshot: Record<string, unknown>,
    publishedAt: Date,
  ): Promise<StrategicPlanPublicResponseDto> {
    const seo = (snapshot.seo ?? null) as Record<string, unknown> | null;
    const images = await this.mediaAssetsService.resolvePublicImages([
      ...IMAGE_KEYS.map((key) => snapshot[key]),
      seo?.ogImageId,
    ]);
    const imageOf = (key: (typeof IMAGE_KEYS)[number]) => images.get(String(snapshot[key])) ?? null;
    const shown = (key: PlanListKey) => list(snapshot[key]).filter(visible);

    const items = (key: PlanListKey): PublicPlanItemDto[] =>
      shown(key)
        .map((item) => ({
          id: String(item._id),
          title: item.title as LocalizedTextDto,
          description: item.description as LocalizedTextDto,
          displayOrder: Number(item.displayOrder ?? 0),
        }))
        .sort(byOrder);

    const phases: PublicPlanPhaseDto[] = shown('phases')
      .map((phase) => ({
        id: String(phase._id),
        title: phase.title as LocalizedTextDto,
        description: phase.description as LocalizedTextDto,
        iconKey: String(phase.iconKey),
        displayOrder: Number(phase.displayOrder ?? 0),
      }))
      .sort(byOrder);

    const metrics: PublicPlanMetricDto[] = shown('metrics')
      .map((metric) => ({
        id: String(metric._id),
        value: String(metric.value),
        label: metric.label as LocalizedTextDto,
        displayOrder: Number(metric.displayOrder ?? 0),
      }))
      .sort(byOrder);

    const executionSteps: PublicPlanStepDto[] = shown('executionSteps')
      .map((step) => ({
        id: String(step._id),
        title: step.title as LocalizedTextDto,
        description: (step.description ?? null) as LocalizedTextDto | null,
        displayOrder: Number(step.displayOrder ?? 0),
      }))
      .sort(byOrder);

    return {
      heroTitle: snapshot.heroTitle as LocalizedTextDto,
      heroSubtitle: snapshot.heroSubtitle as LocalizedTextDto,
      heroImage: imageOf('heroImageId'),
      introHeading: snapshot.introHeading as LocalizedTextDto,
      introText: snapshot.introText as LocalizedTextDto,
      introImage: imageOf('introImageId'),
      phasesTitle: (snapshot.phasesTitle ?? null) as LocalizedTextDto | null,
      phases,
      pillarsTitle: snapshot.pillarsTitle as LocalizedTextDto,
      pillarsText: (snapshot.pillarsText ?? null) as LocalizedTextDto | null,
      pillars: items('pillars'),
      objectivesTitle: snapshot.objectivesTitle as LocalizedTextDto,
      objectivesImage: imageOf('objectivesImageId'),
      objectives: items('objectives'),
      metricsTitle: snapshot.metricsTitle as LocalizedTextDto,
      metricsImage: imageOf('metricsImageId'),
      metrics,
      executionTitle: snapshot.executionTitle as LocalizedTextDto,
      executionText: (snapshot.executionText ?? null) as LocalizedTextDto | null,
      executionSteps,
      ctaTitle: snapshot.ctaTitle as LocalizedTextDto,
      ctaText: (snapshot.ctaText ?? null) as LocalizedTextDto | null,
      ctaImage: imageOf('ctaImageId'),
      seo: seo
        ? {
            metaTitle: (seo.metaTitle ?? null) as LocalizedTextDto | null,
            metaDescription: (seo.metaDescription ?? null) as LocalizedTextDto | null,
            ogImage: images.get(String(seo.ogImageId)) ?? null,
          }
        : null,
      publishedAt: publishedAt.toISOString(),
    };
  }

  /** @throws ForbiddenException when at least one revision exists. */
  async assertHardDeletable(id: string): Promise<void> {
    return this.revisionsService.assertHardDeletable(ENTITY_TYPE, new Types.ObjectId(id));
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<StrategicPlansPageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  private async assertUsableImages(
    dto: CreateStrategicPlansPageDto | UpdateStrategicPlansPageDto,
  ): Promise<void> {
    for (const key of IMAGE_KEYS) {
      const id = dto[key];
      if (id) {
        await this.mediaAssetsService.assertUsableImage(id);
      }
    }
    if (dto.seo?.ogImageId) {
      await this.mediaAssetsService.assertUsableImage(dto.seo.ogImageId);
    }
  }
}
