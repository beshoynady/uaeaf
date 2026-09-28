import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationsRepository } from './federation.repository.js';
import type { FederationDocument } from './schemas/federation.schema.js';
import { CreateFederationDto } from './dto/create-federation.dto.js';
import { UpdateFederationDto } from './dto/update-federation.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { partialUpdate, setObjectIdField } from '../../../common/utils/partial-update.util.js';

/** Implements: federation collection, Domain 1 — Federation & Governance.
 *
 *  Plain CRUD, deliberately NOT singleton-enforced: although exactly one
 *  federation row is expected in practice (several collections carry a
 *  `federationId` ref to it), the live board states no singleton
 *  constraint, and confirmed decision #8 names only `siteSettings` and the
 *  hero-wrapper `*Page` collections. Flagged rather than invented. */
@Injectable()
export class FederationsService {
  constructor(
    private readonly repository: FederationsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  async create(dto: CreateFederationDto): Promise<FederationDocument> {
    await this.mediaAssetsService.assertUsableImage(dto.logoId);

    return this.repository.create({
      name: dto.name,
      shortName: dto.shortName ?? null,
      acronym: dto.acronym ?? null,
      logoId: new Types.ObjectId(dto.logoId),
      address: dto.address ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      registrationNumber: dto.registrationNumber ?? null,
      registrationAuthority: dto.registrationAuthority ?? null,
      status: dto.status,
    });
  }

  async findAll(): Promise<FederationDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<FederationDocument | null> {
    return this.repository.findById(id);
  }

  /**
   * `logoId`'s validity does not depend on anything this row remembers —
   * the same "exists, not archived, actually an image" check `create()`
   * runs is re-run here when it changes (Fix round 1, CLAUDE.md §31),
   * mirroring `HeroSlidesService.update()`'s established convention for
   * image references ("only images arriving in this request are checked").
   * `logoId` is `required: true` in the schema (Fix round 2 — a federation
   * always has a logo), so a real value is validated and cast, and an
   * explicit `null` is refused rather than checked against a non-existent
   * asset.
   *
   * @throws NotFoundException when no such federation row exists, or when
   *   `logoId` is sent as a real id that doesn't reference an existing,
   *   non-archived `MediaAsset`.
   * @throws ConflictException when `logoId` is sent and isn't an image type.
   * @throws BadRequestException when `logoId` is sent as `null`.
   */
  async update(id: string, dto: UpdateFederationDto): Promise<FederationDocument> {
    if (dto.logoId) {
      await this.mediaAssetsService.assertUsableImage(dto.logoId);
    }

    const update = partialUpdate(dto);
    setObjectIdField(update, dto, 'logoId', { nullable: false });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Federation ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<FederationDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<FederationDocument | null> {
    return this.repository.restore(id);
  }
}
