import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { PresidentMessagePagesRepository } from './president-message-page.repository.js';
import type { PresidentMessagePageDocument } from './schemas/president-message-page.schema.js';
import { CreatePresidentMessagePageDto } from './dto/create-president-message-page.dto.js';
import { UpdatePresidentMessagePageDto } from './dto/update-president-message-page.dto.js';
import { WITHHELD_PAGE, type WithheldPageDto } from '../../../common/dto/withheld-page.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { toPageSeo } from '../../../common/dto/page-seo.dto.js';
import { FederationAppointmentsService } from '../federation-appointments/federation-appointments.service.js';
import type { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import type { PresidentMessagePublicResponseDto } from './dto/president-message-public-response.dto.js';

/** The media-asset refs this entity carries; each must resolve to a usable
 *  image before it is stored, whichever route supplied it. */
const IMAGE_REF_KEYS = ['heroImageId', 'featuredImageId'] as const;

/** Implements: presidentMessagePage collection, Domain 1 — Federation &
 *  Governance. Workflow-governed (List A + List B), wired like Week 3's
 *  `DocumentsService` mode (a).
 *
 *  Per confirmed decision #4, `signatoryName`/`signatoryTitle` are stored
 *  exactly as supplied (display snapshots) and are never derived from, nor
 *  used to resolve, the canonical `federationAppointmentId` chain. */
@Injectable()
export class PresidentMessagePagesService {
  constructor(
    private readonly repository: PresidentMessagePagesRepository,
    private readonly publicationsService: PublicationsService,
    private readonly revisionsService: RevisionsService,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly appointmentsService: FederationAppointmentsService,
  ) {}

  async create(dto: CreatePresidentMessagePageDto): Promise<PresidentMessagePageDocument> {
    await this.assertUsableImages(dto);

    return this.repository.create({
      federationAppointmentId: new Types.ObjectId(dto.federationAppointmentId),
      heroImageId: dto.heroImageId ? new Types.ObjectId(dto.heroImageId) : null,
      heroTitle: dto.heroTitle,
      heroSubtitle: dto.heroSubtitle,
      featuredImageId: dto.featuredImageId ? new Types.ObjectId(dto.featuredImageId) : null,
      pullQuote: dto.pullQuote ?? null,
      messageBody: dto.messageBody,
      valuesTitle: dto.valuesTitle ?? null,
      values: dto.values ?? [],
      signatoryName: dto.signatoryName,
      signatoryTitle: dto.signatoryTitle,
      seo: dto.seo ? toPageSeo(dto.seo) : null,
      publicationState: dto.publicationState,
    });
  }

  /**
   * Applies only the keys the request actually carried.
   *
   * A key that is absent is left alone; a key sent as `null` clears the
   * field. Rebuilding the whole document from the body instead would make
   * every partial save a silent full overwrite — two editors on two
   * sections of the same message would each erase the other's work.
   *
   * @throws NotFoundException when no live row has that id.
   */
  async update(
    id: string,
    dto: UpdatePresidentMessagePageDto,
    updatedBy: Types.ObjectId,
  ): Promise<PresidentMessagePageDocument> {
    await this.assertUsableImages(dto);

    const set: Record<string, unknown> = { updatedBy };

    // `!== undefined`, never `key in dto`. The project compiles to ES2023, so
    // `useDefineForClassFields` is on and every field the DTO class declares
    // exists on the instance whether the request carried it or not — a
    // presence test reports all of them as sent. `null` still means "clear
    // this", because only an absent key is `undefined`.
    for (const key of [
      'heroTitle',
      'heroSubtitle',
      'pullQuote',
      'messageBody',
      'valuesTitle',
      'values',
      'signatoryName',
      'signatoryTitle',
    ] as const) {
      if (dto[key] !== undefined) {
        set[key] = dto[key];
      }
    }

    for (const key of IMAGE_REF_KEYS) {
      if (dto[key] !== undefined) {
        const value = dto[key];
        set[key] = value ? new Types.ObjectId(value) : null;
      }
    }

    if (dto.seo !== undefined) {
      set.seo = dto.seo ? toPageSeo(dto.seo) : null;
    }

    const updated = await this.repository.updateById(id, {
      $set: set,
    } as UpdateQuery<PresidentMessagePageDocument>);

    if (!updated) {
      throw new NotFoundException('President message page not found.');
    }

    return updated;
  }

  /** The admin listing. Carries `isActive`, which the dashboard draws as the
   *  page's live state beside the row it opens — an ordinary read excludes it
   *  (ADR-0102 §D4). */
  async findAll(): Promise<PresidentMessagePageDocument[]> {
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
  ): Promise<PresidentMessagePageDocument> {
    const updated = await this.repository.updateById(id, {
      $set: { isActive, updatedBy },
    } as UpdateQuery<PresidentMessagePageDocument>);

    if (!updated) {
      throw new NotFoundException('President message page not found.');
    }
    return updated;
  }

  async findById(id: string): Promise<PresidentMessagePageDocument | null> {
    return this.repository.findById(id);
  }

  /** The sole public read path (Week 2 "Approved ≠ Published" rule). */
  async getPublicSnapshot(id: string): Promise<Record<string, unknown> | null> {
    return this.publicationsService.getPublicSnapshot(
      'presidentMessagePage',
      new Types.ObjectId(id),
    );
  }

  /**
   * The message `/about/president` shows: the published message of the
   * sitting president's term (ADR-0069 D3, owner decision Q15).
   *
   * "The newest published row" would be the obvious rule and the wrong one —
   * a draft prepared for an incoming president would replace the sitting
   * one's message the moment it was published. The term decides; the date
   * only breaks a tie within it.
   *
   * Returns `null` — HTTP 200 with a null body, the convention
   * `AlbumsService` set — when no such message is Live.
   */
  async getCurrentPublic(): Promise<PresidentMessagePublicResponseDto | WithheldPageDto | null> {
    const appointments = await this.appointmentsService.findActiveByRole('President');
    if (appointments.length === 0) {
      return null;
    }

    const appointmentIds = appointments.map((appointment) => appointment._id as Types.ObjectId);
    const records = await this.repository.find({ federationAppointmentId: { $in: appointmentIds } });

    const candidates = await Promise.all(
      records.map(async (record) => {
        const entityId = record._id as Types.ObjectId;
        const publication = await this.publicationsService.findLive('presidentMessagePage', entityId);
        if (!publication) {
          return null;
        }
        const snapshot = await this.publicationsService.getPublicSnapshot(
          'presidentMessagePage',
          entityId,
        );
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
  }): Promise<PresidentMessagePublicResponseDto | WithheldPageDto> {
    const record = await this.repository.findByIdWithActivation(live.entityId.toString());
    if (record?.isActive !== true) {
      return WITHHELD_PAGE;
    }
    return this.toPublicResponse(live.snapshot, live.publishedAt);
  }

  /**
   * Builds the public shape field by field from the published snapshot.
   *
   * Every field is named. Anything the snapshot carries and this method does
   * not mention — the appointment link, the timestamps, whatever is added to
   * the collection next — does not reach a visitor.
   */
  private async toPublicResponse(
    snapshot: Record<string, unknown>,
    publishedAt: Date,
  ): Promise<PresidentMessagePublicResponseDto> {
    const seo = (snapshot.seo ?? null) as Record<string, unknown> | null;

    const images = await this.mediaAssetsService.resolvePublicImages([
      snapshot.heroImageId,
      snapshot.featuredImageId,
      seo?.ogImageId,
    ]);

    const values = Array.isArray(snapshot.values) ? (snapshot.values as Record<string, unknown>[]) : [];

    return {
      heroTitle: snapshot.heroTitle as LocalizedTextDto,
      heroSubtitle: snapshot.heroSubtitle as LocalizedTextDto,
      signatoryName: snapshot.signatoryName as LocalizedTextDto,
      signatoryTitle: snapshot.signatoryTitle as LocalizedTextDto,
      pullQuote: (snapshot.pullQuote ?? null) as LocalizedTextDto | null,
      messageBody: (snapshot.messageBody ?? {}) as Record<string, unknown>,
      valuesTitle: (snapshot.valuesTitle ?? null) as LocalizedTextDto | null,
      values: values
        .map((value) => ({
          title: value.title as LocalizedTextDto,
          description: value.description as LocalizedTextDto,
          iconKey: String(value.iconKey),
          displayOrder: Number(value.displayOrder ?? 0),
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder),
      heroImage: images.get(String(snapshot.heroImageId)) ?? null,
      featuredImage: images.get(String(snapshot.featuredImageId)) ?? null,
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
    return this.revisionsService.assertHardDeletable('presidentMessagePage', new Types.ObjectId(id));
  }

  async remove(
    id: string,
    archivedBy: Types.ObjectId,
  ): Promise<PresidentMessagePageDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  private async assertUsableImages(
    dto: CreatePresidentMessagePageDto | UpdatePresidentMessagePageDto,
  ): Promise<void> {
    for (const key of IMAGE_REF_KEYS) {
      const value = dto[key];
      if (value) {
        await this.mediaAssetsService.assertUsableImage(value);
      }
    }

    const ogImageId = dto.seo?.ogImageId;
    if (ogImageId) {
      await this.mediaAssetsService.assertUsableImage(ogImageId);
    }
  }
}
