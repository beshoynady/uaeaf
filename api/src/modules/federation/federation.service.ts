import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationsRepository } from './federation.repository.js';
import type { FederationDocument } from './schemas/federation.schema.js';
import { CreateFederationDto } from './dto/create-federation.dto.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';

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

  async remove(id: string, archivedBy: Types.ObjectId): Promise<FederationDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
