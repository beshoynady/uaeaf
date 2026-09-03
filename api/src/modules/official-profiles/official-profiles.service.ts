import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { OfficialProfilesRepository } from './official-profiles.repository.js';
import type { OfficialProfileDocument } from './schemas/official-profile.schema.js';
import { CreateOfficialProfileDto } from './dto/create-official-profile.dto.js';
import { OfficialProfilePublicResponseDto } from './dto/official-profile-public-response.dto.js';
import { OfficialsService } from '../officials/officials.service.js';
import type { OfficialPublicResponseDto } from '../officials/dto/official-public-response.dto.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../common/utils/mongo-errors.util.js';

/** Implements: officialProfiles collection, Domain 2 — People & Organizations
 *  (FigJam node `559:8225`). Enforces the same 1:1, Local-only linkage rule
 *  as `AthleteProfilesService` (decision #1), mirrored here for officials. */
@Injectable()
export class OfficialProfilesService {
  constructor(
    private readonly repository: OfficialProfilesRepository,
    private readonly officialsService: OfficialsService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** @throws NotFoundException when `dto.officialId` doesn't reference an
   *  existing official, or `dto.photoId` doesn't reference an existing,
   *  non-archived `MediaAsset`.
   *  @throws ConflictException when that official is `residencyType='Guest'`,
   *  already has a profile, `dto.photoId` isn't an image type, or
   *  `dto.slug`/`dto.registrationNumber` is already taken. */
  async create(dto: CreateOfficialProfileDto): Promise<OfficialProfileDocument> {
    const official = await this.officialsService.findById(dto.officialId);
    if (!official) {
      throw new NotFoundException(`Official ${dto.officialId} not found.`);
    }
    if (official.residencyType !== 'Local') {
      throw new ConflictException('An officialProfiles row can only be created for a Local-residency official.');
    }
    const officialId = new Types.ObjectId(dto.officialId);
    const existing = await this.repository.findByOfficial(officialId);
    if (existing) {
      throw new ConflictException(`Official ${dto.officialId} already has a profile.`);
    }
    if (dto.photoId) {
      await this.mediaAssetsService.assertUsableImage(dto.photoId);
    }

    try {
      return await this.repository.create({
        officialId,
        slug: dto.slug,
        clubId: dto.clubId ? new Types.ObjectId(dto.clubId) : null,
        registrationNumber: dto.registrationNumber,
        photoId: dto.photoId ? new Types.ObjectId(dto.photoId) : null,
        bio: dto.bio ?? null,
        gender: dto.gender,
        status: dto.status,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'field'}.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<OfficialProfileDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<OfficialProfileDocument | null> {
    return this.repository.findById(id);
  }

  /** Public routing resolution: `/officials/:slug` →
   *  `officialProfiles.slug` → `officialId` → `officials`. Mirrors
   *  `AthleteProfilesService.getPublicBySlug()` — see its doc comment. */
  async getPublicBySlug(
    slug: string,
  ): Promise<{ profile: OfficialProfilePublicResponseDto; official: OfficialPublicResponseDto } | null> {
    const profile = await this.repository.findBySlug(slug);
    if (!profile) {
      return null;
    }
    const official = await this.officialsService.findById(profile.officialId.toString());
    if (!official) {
      return null;
    }
    return {
      profile: this.toPublicResponse(profile),
      official: this.officialsService.toPublicResponse(official),
    };
  }

  /** Maps a full `OfficialProfile` document to its public-safe shape. */
  toPublicResponse(profile: OfficialProfileDocument): OfficialProfilePublicResponseDto {
    return {
      id: profile._id.toString(),
      officialId: profile.officialId.toString(),
      slug: profile.slug,
      clubId: profile.clubId ? profile.clubId.toString() : null,
      registrationNumber: profile.registrationNumber,
      photoId: profile.photoId ? profile.photoId.toString() : null,
      bio: profile.bio,
      gender: profile.gender,
      status: profile.status,
    };
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<OfficialProfileDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
