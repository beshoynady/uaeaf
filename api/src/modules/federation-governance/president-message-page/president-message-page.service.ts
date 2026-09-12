import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { UpdateQuery } from 'mongoose';
import { PresidentMessagePagesRepository } from './president-message-page.repository.js';
import type { PresidentMessagePageDocument } from './schemas/president-message-page.schema.js';
import { CreatePresidentMessagePageDto } from './dto/create-president-message-page.dto.js';
import { UpdatePresidentMessagePageDto } from './dto/update-president-message-page.dto.js';
import { PublicationsService } from '../../workflow/publications/publications.service.js';
import { RevisionsService } from '../../workflow/revisions/revisions.service.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import type { PageSeo } from '../../../common/schemas/page-seo.schema.js';
import { FederationAppointmentsService } from '../federation-appointments/federation-appointments.service.js';
import type { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import type {
  PresidentMessagePublicResponseDto,
  PublicImageDto,
} from './dto/president-message-public-response.dto.js';

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
      seo: dto.seo ? this.toSeo(dto.seo) : null,
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
      set.seo = dto.seo ? this.toSeo(dto.seo) : null;
    }

    const updated = await this.repository.updateById(id, {
      $set: set,
    } as UpdateQuery<PresidentMessagePageDocument>);

    if (!updated) {
      throw new NotFoundException('President message page not found.');
    }

    return updated;
  }

  async findAll(): Promise<PresidentMessagePageDocument[]> {
    return this.repository.find();
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
  async getCurrentPublic(): Promise<PresidentMessagePublicResponseDto | null> {
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
        return snapshot ? { snapshot, publishedAt: publication.publishedAt } : null;
      }),
    );

    const live = candidates
      .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
      .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];

    return live ? this.toPublicResponse(live.snapshot, live.publishedAt) : null;
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

    const images = await this.resolveImages([
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

  /** Resolves the record's image refs in one query, keyed by id string. */
  private async resolveImages(ids: unknown[]): Promise<Map<string, PublicImageDto>> {
    const wanted = ids.filter((id): id is Types.ObjectId | string => Boolean(id)).map(String);
    if (wanted.length === 0) {
      return new Map();
    }

    const assets = await this.mediaAssetsService.findPublicByIds([...new Set(wanted)]);

    return new Map(
      assets.map((asset) => [
        asset.id,
        {
          url: asset.file.url,
          altText: asset.altText,
          width: asset.file.width,
          height: asset.file.height,
        },
      ]),
    );
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

  private toSeo(seo: NonNullable<CreatePresidentMessagePageDto['seo']>): PageSeo {
    return {
      metaTitle: seo.metaTitle ?? null,
      metaDescription: seo.metaDescription ?? null,
      ogImageId: seo.ogImageId ? new Types.ObjectId(seo.ogImageId) : null,
    };
  }
}
