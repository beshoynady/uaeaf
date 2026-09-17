import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { SponsorshipsRepository } from './sponsorships.repository.js';
import { SCOPE_LABEL_MAX } from './schemas/sponsorship.schema.js';
import type { SponsorshipDocument, SponsorshipTargetType } from './schemas/sponsorship.schema.js';
import { CreateSponsorshipDto, UpdateSponsorshipDto } from './dto/create-sponsorship.dto.js';
import type { SponsorshipPublicResponseDto } from './dto/sponsorship-public-response.dto.js';
import { SponsorsService } from '../sponsors/sponsors.service.js';
import { FederationsService } from '../../federation-governance/federation/federation.service.js';
import { wasSent } from '../../../common/utils/partial-update.util.js';
import { sponsorshipState } from '../../../common/utils/sponsorship-window.util.js';
import { assertWindowOrder, dateOrNull, hidesDemoRecords } from '../common/relation-rules.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';

/** Characters as a reader counts them. */
const graphemes = (text: string): number =>
  [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text.trim())].length;

/** Implements: sponsorships collection, Domain 9 (ADR-0077 D2, ADR-0085 D1). */
@Injectable()
export class SponsorshipsService {
  constructor(
    private readonly repository: SponsorshipsRepository,
    private readonly sponsorsService: SponsorsService,
    private readonly federationsService: FederationsService,
    private readonly config: ConfigService,
  ) {}

  /**
   * @throws NotFoundException when the sponsor does not exist.
   * @throws BadRequestException `sponsorshipEndsBeforeStart`,
   * `sponsorshipEndRequired` (Championship/Event without an end),
   * `invalidSponsorshipTarget` (a Federation target that is not the
   * federation), or a scope label past 120 characters.
   */
  async create(dto: CreateSponsorshipDto): Promise<SponsorshipDocument> {
    if (!(await this.sponsorsService.findById(dto.sponsorId))) {
      throw new NotFoundException('Sponsor not found.');
    }
    const startDate = new Date(dto.startDate);
    const endDate = dateOrNull(dto.endDate);
    assertWindowOrder(startDate, endDate);
    this.assertEndForTarget(dto.targetType, endDate);
    const targetId = await this.resolveTarget(dto.targetType, dto.targetId ?? null);
    this.assertScopeLabel(dto.scopeLabel ?? null);

    return this.repository.create({
      sponsorId: new Types.ObjectId(dto.sponsorId),
      targetType: dto.targetType,
      targetId,
      tier: dto.tier,
      startDate,
      endDate,
      status: dto.status ?? 'Active',
      bannerAssetId: dto.bannerAssetId ? new Types.ObjectId(dto.bannerAssetId) : null,
      promotionalText: dto.promotionalText ?? null,
      scopeLabel: dto.scopeLabel ?? null,
      isFeatured: dto.isFeatured ?? false,
      displayOrder: dto.displayOrder,
      isVisible: dto.isVisible ?? false,
      isDemo: false,
    });
  }

  /** Checks the window and the target on the sponsorship the edit produces,
   *  not on the body: `{ endDate }` alone is valid as a body and can still
   *  end before a stored start. `status` changes only when sent — the system
   *  never writes `Expired` (ADR-0077 D2).
   *  @throws NotFoundException when no such sponsorship exists. */
  async update(id: string, dto: UpdateSponsorshipDto): Promise<SponsorshipDocument> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Sponsorship not found.');

    const has = (key: keyof UpdateSponsorshipDto) => wasSent(dto, key);
    const startDate = has('startDate') ? new Date(dto.startDate!) : current.startDate;
    const endDate = has('endDate') ? dateOrNull(dto.endDate) : (current.endDate ?? null);
    const targetType = dto.targetType ?? current.targetType;
    assertWindowOrder(startDate, endDate);
    this.assertEndForTarget(targetType, endDate);
    if (has('scopeLabel')) this.assertScopeLabel(dto.scopeLabel ?? null);

    const update: Record<string, unknown> = {};
    if (has('sponsorId')) {
      if (!(await this.sponsorsService.findById(dto.sponsorId!))) throw new NotFoundException('Sponsor not found.');
      update.sponsorId = new Types.ObjectId(dto.sponsorId!);
    }
    if (has('targetType') || has('targetId')) {
      update.targetType = targetType;
      update.targetId = await this.resolveTarget(
        targetType,
        has('targetId') ? (dto.targetId ?? null) : (current.targetId?.toString() ?? null),
      );
    }
    if (has('tier')) update.tier = dto.tier;
    if (has('startDate')) update.startDate = startDate;
    if (has('endDate')) update.endDate = endDate;
    if (has('status')) update.status = dto.status;
    if (has('bannerAssetId')) update.bannerAssetId = dto.bannerAssetId ? new Types.ObjectId(dto.bannerAssetId) : null;
    if (has('promotionalText')) update.promotionalText = dto.promotionalText ?? null;
    if (has('scopeLabel')) update.scopeLabel = dto.scopeLabel ?? null;
    if (has('isFeatured')) update.isFeatured = dto.isFeatured;
    if (has('displayOrder')) update.displayOrder = dto.displayOrder;
    if (has('isVisible')) update.isVisible = dto.isVisible;

    const saved = await this.repository.updateById(id, update);
    if (!saved) throw new NotFoundException('Sponsorship not found.');
    return saved;
  }

  async findAll(): Promise<SponsorshipDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<SponsorshipDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<SponsorshipDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /** What the public sees at `now`: visible, running in Asia/Dubai, not
   *  cancelled, its sponsor still present — and, in production, not a demo
   *  record. Sorted by `displayOrder`. Expiry is decided here, at read time,
   *  never written (ADR-0077 D2). */
  async findPublic(now: Date = new Date()): Promise<SponsorshipPublicResponseDto[]> {
    const hideDemo = hidesDemoRecords(this.config);
    // Checked on each record as well as in the query, so the rule holds even
    // if the query is ever widened.
    const running = (await this.repository.find({ isVisible: true }))
      .filter((sponsorship) => sponsorship.isVisible === true)
      .filter((sponsorship) => !(hideDemo && sponsorship.isDemo))
      .filter((sponsorship) => sponsorshipState(sponsorship, now) === 'active')
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const sponsorIds = [...new Set(running.map((sponsorship) => sponsorship.sponsorId.toString()))];
    const sponsors = await this.sponsorsService.findByIds(sponsorIds);
    const projected = await this.sponsorsService.toPublicResponses(
      sponsors.filter((sponsor) => !(hideDemo && sponsor.isDemo)),
    );
    const byId = new Map(projected.map((sponsor) => [sponsor.id, sponsor]));

    // A sponsorship whose sponsor is archived or missing is dropped rather
    // than sent as a nameless card: an empty card is worse than none.
    return running.flatMap((sponsorship) => {
      const sponsor = byId.get(sponsorship.sponsorId.toString());
      if (!sponsor) return [];
      return [
        {
          id: sponsorship._id.toString(),
          sponsor,
          tier: sponsorship.tier,
          targetType: sponsorship.targetType,
          scopeLabel: sponsorship.scopeLabel ?? null,
          isFeatured: sponsorship.isFeatured,
          displayOrder: sponsorship.displayOrder,
          startDate: sponsorship.startDate.toISOString(),
          endDate: sponsorship.endDate ? sponsorship.endDate.toISOString() : null,
        },
      ];
    });
  }

  /** A championship or event sponsorship ends with its event, so it must
   *  carry an end even before the event collections exist (ADR-0085 D1).
   *  @throws BadRequestException `sponsorshipEndRequired`. */
  private assertEndForTarget(targetType: SponsorshipTargetType, endDate: Date | null): void {
    if (targetType !== 'Federation' && !endDate) {
      throw new BadRequestException({
        code: 'sponsorshipEndRequired',
        message: `A ${targetType} sponsorship needs an endDate.`,
        field: 'endDate',
      });
    }
  }

  /** The stored target: for Federation, the federation record or nothing
   *  (read as the federation); for the other two, whatever was sent, which
   *  is nothing until championships and events exist.
   *  @throws BadRequestException `invalidSponsorshipTarget`. */
  private async resolveTarget(targetType: SponsorshipTargetType, targetId: string | null): Promise<Types.ObjectId | null> {
    if (!targetId) return null;
    if (targetType === 'Federation') {
      const federations = await this.federationsService.findAll();
      if (!federations.some((federation) => federation._id.toString() === targetId)) {
        throw new BadRequestException({
          code: 'invalidSponsorshipTarget',
          message: 'A Federation sponsorship may point at the federation record only, or at nothing.',
          field: 'targetId',
        });
      }
    }
    return new Types.ObjectId(targetId);
  }

  /** @throws BadRequestException when a side is past 120 characters. */
  private assertScopeLabel(label: LocalizedText | null): void {
    if (!label) return;
    for (const language of ['ar', 'en'] as const) {
      if (graphemes(label[language] ?? '') > SCOPE_LABEL_MAX) {
        throw new BadRequestException({
          code: 'badRequest',
          message: `scopeLabel.${language} is longer than ${SCOPE_LABEL_MAX} characters.`,
          field: `scopeLabel.${language}`,
          limit: SCOPE_LABEL_MAX,
        });
      }
    }
  }
}
