import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SponsorsRepository } from './sponsors.repository.js';
import type { SponsorDocument } from './schemas/sponsor.schema.js';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/create-sponsor.dto.js';
import type { SponsorPublicResponseDto } from './dto/sponsor-public-response.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { normalizeOrganizationName } from '../../../common/schemas/organization-name.schema.js';
import { wasSent } from '../../../common/utils/partial-update.util.js';
import { assertWebsite, publicName } from '../common/relation-rules.js';

/** Implements: sponsors collection, Domain 9 (ADR-0077 D1, ADR-0085). */
@Injectable()
export class SponsorsService {
  constructor(
    private readonly repository: SponsorsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** @throws BadRequestException `missingRequiredField` (no name on either
   *  side), `organizationNameTooLong`, or a bad website.
   *  @throws NotFoundException / ConflictException from the logo check. */
  async create(dto: CreateSponsorDto): Promise<SponsorDocument> {
    const name = normalizeOrganizationName(dto.name, 'name');
    assertWebsite(dto.website);
    this.assertLogoPresent(dto.logoId);
    await this.mediaAssetsService.assertUsableImage(dto.logoId);

    // `isDemo` is never read from the request: a demo mark is the seed's
    // alone, so an editor cannot promote a fictional record to production.
    return this.repository.create({
      name,
      logoId: new Types.ObjectId(dto.logoId),
      website: dto.website ?? null,
      categoryLabel: dto.categoryLabel ?? null,
      restricted: this.storedRestricted(dto.restricted),
      isDemo: false,
    });
  }

  /** @throws NotFoundException when no such sponsor exists. */
  async update(id: string, dto: UpdateSponsorDto): Promise<SponsorDocument> {
    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException('Sponsor not found.');

    const has = (key: keyof UpdateSponsorDto) => wasSent(dto, key);
    const update: Record<string, unknown> = {};
    if (has('name')) update.name = normalizeOrganizationName(dto.name, 'name');
    if (has('website')) {
      assertWebsite(dto.website);
      update.website = dto.website ?? null;
    }
    if (has('logoId')) {
      this.assertLogoPresent(dto.logoId);
      await this.mediaAssetsService.assertUsableImage(dto.logoId!);
      update.logoId = new Types.ObjectId(dto.logoId!);
    }
    if (has('categoryLabel')) update.categoryLabel = dto.categoryLabel ?? null;
    if (has('restricted')) update.restricted = this.storedRestricted(dto.restricted);

    const saved = await this.repository.updateById(id, update);
    if (!saved) throw new NotFoundException('Sponsor not found.');
    return saved;
  }

  async findAll(): Promise<SponsorDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<SponsorDocument | null> {
    return this.repository.findById(id);
  }

  async findByIds(ids: readonly string[]): Promise<SponsorDocument[]> {
    return this.repository.findByIds(ids);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<SponsorDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /** The public shape of each sponsor, logos resolved in one query. Written
   *  field by field so `restricted` cannot travel by accident. */
  async toPublicResponses(sponsors: SponsorDocument[]): Promise<SponsorPublicResponseDto[]> {
    const images = await this.mediaAssetsService.resolvePublicImages(sponsors.map((sponsor) => sponsor.logoId));
    return sponsors.map((sponsor) => ({
      id: sponsor._id.toString(),
      name: publicName(sponsor.name),
      logo: sponsor.logoId ? (images.get(sponsor.logoId.toString()) ?? null) : null,
      website: sponsor.website ?? null,
      categoryLabel: sponsor.categoryLabel ?? null,
    }));
  }

  /** @throws BadRequestException `missingRequiredField` (`logoId`). */
  private assertLogoPresent(logoId: string | null | undefined): void {
    if (!logoId) {
      throw new BadRequestException({
        code: 'missingRequiredField',
        message: 'A sponsor needs a logo.',
        field: 'logoId',
      });
    }
  }

  private storedRestricted(restricted: CreateSponsorDto['restricted']) {
    return {
      contactEmail: restricted?.contactEmail ?? null,
      contactPhone: restricted?.contactPhone ?? null,
      contractValue: restricted?.contractValue ?? null,
      contractDocId: restricted?.contractDocId ? new Types.ObjectId(restricted.contractDocId) : null,
    };
  }
}
