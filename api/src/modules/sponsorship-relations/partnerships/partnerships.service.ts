import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { PartnershipsRepository } from './partnerships.repository.js';
import type { PartnershipDocument } from './schemas/partnership.schema.js';
import { CreatePartnershipDto, UpdatePartnershipDto } from './dto/create-partnership.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { normalizeOrganizationName } from '../../../common/schemas/organization-name.schema.js';
import { wasSent } from '../../../common/utils/partial-update.util.js';
import { assertWindowOrder, dateOrNull, hidesDemoRecords, toOrganizationCard } from '../common/relation-rules.js';
import type { PublicOrganizationCard } from '../common/relation-rules.js';

/** Implements: partnerships collection, Domain 9 (ADR-0077 D3, ADR-0085). */
@Injectable()
export class PartnershipsService {
  constructor(
    private readonly repository: PartnershipsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly config: ConfigService,
  ) {}

  /** @throws BadRequestException `missingRequiredField` (no name),
   *  `organizationNameTooLong`, `sponsorshipEndsBeforeStart`. */
  async create(dto: CreatePartnershipDto): Promise<PartnershipDocument> {
    const partnerName = normalizeOrganizationName(dto.partnerName, 'partnerName');
    const startDate = new Date(dto.startDate);
    const endDate = dateOrNull(dto.endDate);
    assertWindowOrder(startDate, endDate);
    if (dto.partnerLogoId) await this.mediaAssetsService.assertUsableImage(dto.partnerLogoId);

    return this.repository.create({
      partnerName,
      partnerLogoId: dto.partnerLogoId ? new Types.ObjectId(dto.partnerLogoId) : null,
      partnershipType: dto.partnershipType,
      startDate,
      endDate,
      isActive: dto.isActive ?? true,
      displayOrder: dto.displayOrder,
      isVisible: dto.isVisible ?? false,
      isDemo: false,
    });
  }

  /** Checks the window on the record the edit produces.
   *  @throws NotFoundException when no such partnership exists. */
  async update(id: string, dto: UpdatePartnershipDto): Promise<PartnershipDocument> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Partnership not found.');

    const has = (key: keyof UpdatePartnershipDto) => wasSent(dto, key);
    const startDate = has('startDate') ? new Date(dto.startDate!) : current.startDate;
    const endDate = has('endDate') ? dateOrNull(dto.endDate) : (current.endDate ?? null);
    assertWindowOrder(startDate, endDate);

    const update: Record<string, unknown> = {};
    if (has('partnerName')) update.partnerName = normalizeOrganizationName(dto.partnerName, 'partnerName');
    if (has('partnerLogoId')) {
      if (dto.partnerLogoId) await this.mediaAssetsService.assertUsableImage(dto.partnerLogoId);
      update.partnerLogoId = dto.partnerLogoId ? new Types.ObjectId(dto.partnerLogoId) : null;
    }
    if (has('partnershipType')) update.partnershipType = dto.partnershipType;
    if (has('startDate')) update.startDate = startDate;
    if (has('endDate')) update.endDate = endDate;
    if (has('isActive')) update.isActive = dto.isActive;
    if (has('displayOrder')) update.displayOrder = dto.displayOrder;
    if (has('isVisible')) update.isVisible = dto.isVisible;

    const saved = await this.repository.updateById(id, update);
    if (!saved) throw new NotFoundException('Partnership not found.');
    return saved;
  }

  async findAll(): Promise<PartnershipDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<PartnershipDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<PartnershipDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /** The visible partners as logo-plus-name cards, in display order; demo
   *  records hidden in production (ADR-0085 D2.1). */
  async findPublic(): Promise<PublicOrganizationCard[]> {
    const hideDemo = hidesDemoRecords(this.config);
    // Checked on each record as well as in the query, so the rule holds even
    // if the query is ever widened.
    const visible = (await this.repository.find({ isVisible: true }))
      .filter((record) => record.isVisible === true)
      .filter((partnership) => !(hideDemo && partnership.isDemo))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const images = await this.mediaAssetsService.resolvePublicImages(visible.map((partnership) => partnership.partnerLogoId));
    return visible.map((partnership) =>
      toOrganizationCard(partnership._id.toString(), partnership.partnerName, partnership.partnerLogoId, images, partnership.displayOrder),
    );
  }
}
