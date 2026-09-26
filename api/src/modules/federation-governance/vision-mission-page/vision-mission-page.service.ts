import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { VisionMissionPagesRepository } from './vision-mission-page.repository.js';
import type { VisionMissionPageDocument } from './schemas/vision-mission-page.schema.js';
import { CreateVisionMissionPageDto } from './dto/create-vision-mission-page.dto.js';
import { UpdateVisionMissionPageDto } from './dto/update-vision-mission-page.dto.js';
import type { VisionMissionPublicResponseDto } from './dto/vision-mission-public-response.dto.js';
import type { PublicValueDto } from '../../../common/dto/public-page.dto.js';
import { WITHHELD_PAGE, type WithheldPageDto } from '../../../common/dto/withheld-page.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { toPageSeo } from '../../../common/dto/page-seo.dto.js';
import type { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

const ENTITY_TYPE = 'visionMissionPage' as const;

/** The content fields a save copies as sent. The image refs and `seo` are
 *  converted on the way in, so they are handled apart. */
const TEXT_KEYS = [
  'heroTitle',
  'heroSubtitle',
  'visionTitle',
  'visionText',
  'missionTitle',
  'missionText',
  'goalsTitle',
  'strategicGoals',
  'coreValues',
] as const;

/** Every picture the page prints: content with a field, the section
 *  backgrounds as much as the hero (owner rule 2026-09-14, ADR-0070 D1). */
const IMAGE_KEYS = ['heroImageId', 'visionImageId', 'missionImageId', 'valuesImageId', 'ctaImageId'] as const;

const ref = (id: string | null | undefined): Types.ObjectId | null => (id ? new Types.ObjectId(id) : null);

const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

const byOrder = <T extends { displayOrder: number }>(a: T, b: T): number => a.displayOrder - b.displayOrder;

/** Implements: visionMissionPage collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B): saved as a draft here,
 *  published through `PublishingService` (ADR-0070). */
@Injectable()
export class VisionMissionPagesService {
  constructor(
    private readonly repository: VisionMissionPagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  async create(dto: CreateVisionMissionPageDto): Promise<VisionMissionPageDocument> {
    await this.assertUsableImages(dto);

    return this.repository.create({
      federationId: new Types.ObjectId(dto.federationId),
      heroImageId: ref(dto.heroImageId),
      visionImageId: ref(dto.visionImageId),
      missionImageId: ref(dto.missionImageId),
      valuesImageId: ref(dto.valuesImageId),
      ctaImageId: ref(dto.ctaImageId),
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      visionTitle: dto.visionTitle ?? null,
      visionText: dto.visionText,
      missionTitle: dto.missionTitle ?? null,
      missionText: dto.missionText,
      goalsTitle: dto.goalsTitle ?? null,
      strategicGoals: dto.strategicGoals ?? [],
      coreValues: dto.coreValues ?? [],
      seo: dto.seo ? toPageSeo(dto.seo) : null,
      revisionId: null,
      publicationState: dto.publicationState,
    });
  }

  /**
   * Applies only the keys the request actually carried: absent is left alone,
   * `null` clears. `!== undefined` rather than `key in dto`, because every
   * field the DTO class declares exists on the instance under
   * `useDefineForClassFields`.
   *
   * @throws NotFoundException when no live row has that id.
   */
  async update(
    id: string,
    dto: UpdateVisionMissionPageDto,
    updatedBy: Types.ObjectId,
  ): Promise<VisionMissionPageDocument> {
    await this.assertUsableImages(dto);

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

    if (dto.seo !== undefined) {
      set.seo = dto.seo ? toPageSeo(dto.seo) : null;
    }

    const updated = await this.repository.updateById(id, {
      $set: set,
    } as UpdateQuery<VisionMissionPageDocument>);

    if (!updated) {
      throw new NotFoundException('Vision and mission page not found.');
    }

    return updated;
  }

  /** The admin listing. Carries `isActive`, which the dashboard draws as the
   *  page's live state beside the row it opens — an ordinary read excludes it
   *  (ADR-0102 §D4). */
  async findAll(): Promise<VisionMissionPageDocument[]> {
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
  ): Promise<VisionMissionPageDocument> {
    const updated = await this.repository.updateById(id, {
      $set: { isActive, updatedBy },
    } as UpdateQuery<VisionMissionPageDocument>);

    if (!updated) {
      throw new NotFoundException('Vision & mission page not found.');
    }
    return updated;
  }

  async findById(id: string): Promise<VisionMissionPageDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot(ENTITY_TYPE, new Types.ObjectId(id));
  }

  /**
   * The page `/about/governance/vision-mission` shows: the most recently
   * published Live version among the collection's rows.
   *
   * The collection is not singleton-enforced, but it states one federation's
   * vision, so the newest publication is the current statement. Returns
   * `null` — HTTP 200 with a null body — when nothing is Live.
   */
  async getCurrentPublic(): Promise<VisionMissionPublicResponseDto | WithheldPageDto | null> {
    const records = await this.repository.find();

    const candidates = await Promise.all(
      records.map(async (record) => {
        const entityId = record._id as Types.ObjectId;
        const publication = await this.publicationsService.findLive(ENTITY_TYPE, entityId);
        if (!publication) {
          return null;
        }
        const snapshot = await this.publicationsService.getPublicSnapshot(ENTITY_TYPE, entityId);
        return snapshot ? { entityId, snapshot, publishedAt: publication.publishedAt } : null;
      }),
    );

    const live = candidates
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];

    return live ? this.servedOrWithheld(live) : null;
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
  }): Promise<VisionMissionPublicResponseDto | WithheldPageDto> {
    const record = await this.repository.findByIdWithActivation(live.entityId.toString());
    if (record?.isActive !== true) {
      return WITHHELD_PAGE;
    }
    return this.toPublicResponse(live.snapshot, live.publishedAt);
  }

  /** Builds the public shape field by field. Anything the snapshot carries
   *  and this method does not name does not reach a visitor. */
  private async toPublicResponse(
    snapshot: Record<string, unknown>,
    publishedAt: Date,
  ): Promise<VisionMissionPublicResponseDto> {
    const seo = (snapshot.seo ?? null) as Record<string, unknown> | null;
    const images = await this.mediaAssetsService.resolvePublicImages([
      ...IMAGE_KEYS.map((key) => snapshot[key]),
      seo?.ogImageId,
    ]);
    const imageOf = (key: (typeof IMAGE_KEYS)[number]) => images.get(String(snapshot[key])) ?? null;

    const strategicGoals: PublicValueDto[] = list(snapshot.strategicGoals)
      .map((goal) => ({
        title: goal.title as LocalizedTextDto,
        description: goal.description as LocalizedTextDto,
        iconKey: String(goal.iconKey),
        displayOrder: Number(goal.displayOrder ?? 0),
      }))
      .sort(byOrder);

    const coreValues: PublicValueDto[] = list(snapshot.coreValues)
      .map((value) => ({
        title: value.title as LocalizedTextDto,
        description: value.description as LocalizedTextDto,
        iconKey: String(value.iconKey),
        displayOrder: Number(value.displayOrder ?? 0),
      }))
      .sort(byOrder);

    return {
      heroTitle: snapshot.heroTitle as LocalizedTextDto,
      heroSubtitle: snapshot.heroSubtitle as LocalizedTextDto,
      heroImage: imageOf('heroImageId'),
      visionTitle: (snapshot.visionTitle ?? null) as LocalizedTextDto | null,
      visionText: snapshot.visionText as LocalizedTextDto,
      visionImage: imageOf('visionImageId'),
      missionTitle: (snapshot.missionTitle ?? null) as LocalizedTextDto | null,
      missionText: snapshot.missionText as LocalizedTextDto,
      missionImage: imageOf('missionImageId'),
      goalsTitle: (snapshot.goalsTitle ?? null) as LocalizedTextDto | null,
      strategicGoals,
      coreValues,
      valuesImage: imageOf('valuesImageId'),
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

  async remove(id: string, archivedBy: Types.ObjectId): Promise<VisionMissionPageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  private async assertUsableImages(
    dto: CreateVisionMissionPageDto | UpdateVisionMissionPageDto,
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
