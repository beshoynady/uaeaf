import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthleteProfilesRepository } from './athlete-profiles.repository.js';
import type { AthleteProfileDocument } from './schemas/athlete-profile.schema.js';
import { CreateAthleteProfileDto } from './dto/create-athlete-profile.dto.js';
import { AthleteProfilePublicResponseDto } from './dto/athlete-profile-public-response.dto.js';
import type { SocialLinkDto } from '../clubs/dto/social-link.dto.js';
import { AthletesService } from '../athletes/athletes.service.js';
import type { AthletePublicResponseDto } from '../athletes/dto/athlete-public-response.dto.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { SOCIAL_LINK_PLATFORMS } from '../../common/constants/social-platforms.js';
import type { SocialLinkPlatform } from '../../common/constants/social-platforms.js';
import { isDuplicateKeyError, duplicateKeyField } from '../../common/utils/mongo-errors.util.js';

/** `socialLinks[]` count cap. Confirmed final (2026-09-03) — not a
 *  placeholder. */
export const ATHLETE_PROFILE_MAX_SOCIAL_LINKS = 10;

/** Implements: athleteProfiles collection, Domain 2 — People & Organizations
 *  (FigJam node `559:8222`). Enforces the confirmed 1:1, Local-only
 *  linkage rule (decision #1): a profile may only be created for an athlete
 *  that exists and has `residencyType='Local'`, and at most one profile
 *  may exist per athlete (also backed by a unique index on `athleteId` —
 *  see the schema). */
@Injectable()
export class AthleteProfilesService {
  constructor(
    private readonly repository: AthleteProfilesRepository,
    private readonly athletesService: AthletesService,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** @throws NotFoundException when `dto.athleteId` doesn't reference an
   *  existing athlete, or `dto.photoId` doesn't reference an existing,
   *  non-archived `MediaAsset`.
   *  @throws ConflictException when that athlete is `residencyType='Guest'`,
   *  already has a profile, `dto.photoId` isn't an image type, or
   *  `dto.slug`/`dto.registrationNumber` is already taken.
   *  @throws BadRequestException when `dto.socialLinks` violates the
   *  allowed-platform/https-only/count-cap rules. */
  async create(dto: CreateAthleteProfileDto): Promise<AthleteProfileDocument> {
    const athlete = await this.athletesService.findById(dto.athleteId);
    if (!athlete) {
      throw new NotFoundException(`Athlete ${dto.athleteId} not found.`);
    }
    if (athlete.residencyType !== 'Local') {
      throw new ConflictException('An athleteProfiles row can only be created for a Local-residency athlete.');
    }
    const athleteId = new Types.ObjectId(dto.athleteId);
    const existing = await this.repository.findByAthlete(athleteId);
    if (existing) {
      throw new ConflictException(`Athlete ${dto.athleteId} already has a profile.`);
    }
    if (dto.photoId) {
      await this.mediaAssetsService.assertUsableImage(dto.photoId);
    }
    const socialLinks = this.assertValidSocialLinks(dto.socialLinks ?? []);

    try {
      return await this.repository.create({
        athleteId,
        slug: dto.slug,
        clubId: dto.clubId ? new Types.ObjectId(dto.clubId) : null,
        registrationNumber: dto.registrationNumber,
        restricted: {
          emiratesIdOrPassport: dto.restricted.emiratesIdOrPassport ?? null,
          address: dto.restricted.address ?? null,
          phone: dto.restricted.phone ?? null,
          email: dto.restricted.email ?? null,
        },
        status: dto.status,
        photoId: dto.photoId ? new Types.ObjectId(dto.photoId) : null,
        bio: dto.bio ?? null,
        socialLinks,
      });
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new ConflictException(`Duplicate value for ${duplicateKeyField(error) ?? 'field'}.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<AthleteProfileDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AthleteProfileDocument | null> {
    return this.repository.findById(id);
  }

  /** Public routing resolution: `/athletes/:slug` →
   *  `athleteProfiles.slug` → `athleteId` → `athletes`. Returns `null`
   *  (not a thrown error) when nothing matches, mirroring
   *  `PublicationsService.getPublicSnapshot()`'s convention — the future
   *  public HTTP route (Week 4 / CMS scope, not wired here) maps that to a
   *  404. A Guest athlete has no profile row and therefore no result here,
   *  which is intentional. */
  async getPublicBySlug(
    slug: string,
  ): Promise<{ profile: AthleteProfilePublicResponseDto; athlete: AthletePublicResponseDto } | null> {
    const profile = await this.repository.findBySlug(slug);
    if (!profile) {
      return null;
    }
    const athlete = await this.athletesService.findById(profile.athleteId.toString());
    if (!athlete) {
      return null;
    }
    return {
      profile: this.toPublicResponse(profile),
      athlete: this.athletesService.toPublicResponse(athlete),
    };
  }

  /** Maps a full `AthleteProfile` document to its public-safe shape
   *  (excludes `restricted`). */
  toPublicResponse(profile: AthleteProfileDocument): AthleteProfilePublicResponseDto {
    return {
      id: profile._id.toString(),
      athleteId: profile.athleteId.toString(),
      slug: profile.slug,
      clubId: profile.clubId ? profile.clubId.toString() : null,
      registrationNumber: profile.registrationNumber,
      status: profile.status,
      photoId: profile.photoId ? profile.photoId.toString() : null,
      bio: profile.bio,
      socialLinks: profile.socialLinks,
    };
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AthleteProfileDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  /** Validates + dedupes `socialLinks[]`: allowed platform, https-only
   *  URL (rejects `javascript:`/`data:` and any other non-https scheme by
   *  construction), a count cap, and one link per platform (first
   *  occurrence wins, later duplicates for the same platform are dropped)
   *  — 2026-09-03 correction §6. */
  private assertValidSocialLinks(socialLinks: SocialLinkDto[]): SocialLinkDto[] {
    if (socialLinks.length > ATHLETE_PROFILE_MAX_SOCIAL_LINKS) {
      throw new BadRequestException(`At most ${ATHLETE_PROFILE_MAX_SOCIAL_LINKS} social links are allowed.`);
    }
    const seenPlatforms = new Set<string>();
    const deduped: SocialLinkDto[] = [];
    for (const link of socialLinks) {
      if (!SOCIAL_LINK_PLATFORMS.includes(link.platform as SocialLinkPlatform)) {
        throw new BadRequestException(`Unsupported social platform: ${link.platform}.`);
      }
      let protocol: string;
      try {
        protocol = new URL(link.url).protocol;
      } catch {
        throw new BadRequestException(`Invalid social link URL: ${link.url}.`);
      }
      if (protocol !== 'https:') {
        throw new BadRequestException(`Social link URLs must use https: (${link.url}).`);
      }
      if (seenPlatforms.has(link.platform)) {
        continue;
      }
      seenPlatforms.add(link.platform);
      deduped.push(link);
    }
    return deduped;
  }
}
