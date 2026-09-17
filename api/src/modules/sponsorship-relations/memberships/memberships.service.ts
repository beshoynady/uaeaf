import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import { MembershipsRepository } from './memberships.repository.js';
import type { MembershipDocument } from './schemas/membership.schema.js';
import { CreateMembershipDto, UpdateMembershipDto } from './dto/create-membership.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { normalizeOrganizationName } from '../../../common/schemas/organization-name.schema.js';
import { wasSent } from '../../../common/utils/partial-update.util.js';
import { assertWindowOrder, dateOrNull, hidesDemoRecords, toOrganizationCard } from '../common/relation-rules.js';
import type { PublicOrganizationCard } from '../common/relation-rules.js';

/** Implements: memberships collection, Domain 9 (ADR-0037, ADR-0085). */
@Injectable()
export class MembershipsService {
  constructor(
    private readonly repository: MembershipsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
    private readonly config: ConfigService,
  ) {}

  /** @throws BadRequestException `missingRequiredField` (no name),
   *  `organizationNameTooLong`, `sponsorshipEndsBeforeStart`. */
  async create(dto: CreateMembershipDto): Promise<MembershipDocument> {
    const organizationName = normalizeOrganizationName(dto.organizationName, 'organizationName');
    const startDate = new Date(dto.startDate);
    const endDate = dateOrNull(dto.endDate);
    assertWindowOrder(startDate, endDate);
    if (dto.organizationLogoId) await this.mediaAssetsService.assertUsableImage(dto.organizationLogoId);

    return this.repository.create({
      organizationName,
      organizationLogoId: dto.organizationLogoId ? new Types.ObjectId(dto.organizationLogoId) : null,
      membershipType: dto.membershipType,
      startDate,
      endDate,
      status: dto.status ?? 'Active',
      displayOrder: dto.displayOrder,
      isVisible: dto.isVisible ?? false,
      isDemo: false,
    });
  }

  /** Checks the window on the record the edit produces.
   *  @throws NotFoundException when no such membership exists. */
  async update(id: string, dto: UpdateMembershipDto): Promise<MembershipDocument> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Membership not found.');

    const has = (key: keyof UpdateMembershipDto) => wasSent(dto, key);
    const startDate = has('startDate') ? new Date(dto.startDate!) : current.startDate;
    const endDate = has('endDate') ? dateOrNull(dto.endDate) : (current.endDate ?? null);
    assertWindowOrder(startDate, endDate);

    const update: Record<string, unknown> = {};
    if (has('organizationName')) update.organizationName = normalizeOrganizationName(dto.organizationName, 'organizationName');
    if (has('organizationLogoId')) {
      if (dto.organizationLogoId) await this.mediaAssetsService.assertUsableImage(dto.organizationLogoId);
      update.organizationLogoId = dto.organizationLogoId ? new Types.ObjectId(dto.organizationLogoId) : null;
    }
    if (has('membershipType')) update.membershipType = dto.membershipType;
    if (has('startDate')) update.startDate = startDate;
    if (has('endDate')) update.endDate = endDate;
    if (has('status')) update.status = dto.status;
    if (has('displayOrder')) update.displayOrder = dto.displayOrder;
    if (has('isVisible')) update.isVisible = dto.isVisible;

    const saved = await this.repository.updateById(id, update);
    if (!saved) throw new NotFoundException('Membership not found.');
    return saved;
  }

  async findAll(): Promise<MembershipDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<MembershipDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<MembershipDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /** The visible memberships as logo-plus-name cards, in display order; demo
   *  records hidden in production (ADR-0085 D2.1). */
  async findPublic(): Promise<PublicOrganizationCard[]> {
    const hideDemo = hidesDemoRecords(this.config);
    // Checked on each record as well as in the query, so the rule holds even
    // if the query is ever widened.
    const visible = (await this.repository.find({ isVisible: true }))
      .filter((record) => record.isVisible === true)
      .filter((membership) => !(hideDemo && membership.isDemo))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const images = await this.mediaAssetsService.resolvePublicImages(visible.map((membership) => membership.organizationLogoId));
    return visible.map((membership) =>
      toOrganizationCard(
        membership._id.toString(),
        membership.organizationName,
        membership.organizationLogoId,
        images,
        membership.displayOrder,
      ),
    );
  }
}
