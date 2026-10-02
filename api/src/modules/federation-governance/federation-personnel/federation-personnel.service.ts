import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationPersonnelsRepository } from './federation-personnel.repository.js';
import type { FederationPersonnelDocument } from './schemas/federation-personnel.schema.js';
import type { CvEntry, PersonnelCv } from './schemas/personnel-cv.schema.js';
import { CreateFederationPersonnelDto } from './dto/create-federation-personnel.dto.js';
import { UpdateFederationPersonnelDto } from './dto/update-federation-personnel.dto.js';
import type { CvEntryDto, PersonnelCvDto } from './dto/personnel-cv.dto.js';
import { FederationPersonnelPublicResponseDto } from './dto/federation-personnel-public-response.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { partialUpdate, setObjectIdField } from '../../../common/utils/partial-update.util.js';

const toCvEntry = (entry: CvEntryDto): CvEntry => ({
  text: entry.text,
  isVisible: entry.isVisible ?? true,
  order: entry.order,
});

/** The stored shape of `cv`, filling in the five lists a request may omit
 *  in whole or in part. */
const toPersonnelCv = (cv: PersonnelCvDto | undefined): PersonnelCv => ({
  qualifications: (cv?.qualifications ?? []).map(toCvEntry),
  certifications: (cv?.certifications ?? []).map(toCvEntry),
  previousPositions: (cv?.previousPositions ?? []).map(toCvEntry),
  experience: (cv?.experience ?? []).map(toCvEntry),
  achievements: (cv?.achievements ?? []).map(toCvEntry),
});

/** Implements: federationPersonnel collection, Domain 1 — Federation &
 *  Governance. `toPublicResponse()` is the only shape an unauthenticated
 *  reader may see: it structurally drops `internalContact`
 *  (`[RESTRICTED]`). */
@Injectable()
export class FederationPersonnelsService {
  constructor(
    private readonly repository: FederationPersonnelsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {}

  /** @throws ConflictException when another live person holds `dto.slug`. */
  async create(dto: CreateFederationPersonnelDto): Promise<FederationPersonnelDocument> {
    await this.assertSlugFree(dto.slug, null);
    if (dto.photoId) {
      await this.mediaAssetsService.assertUsableImage(dto.photoId);
    }

    return this.repository.create({
      slug: dto.slug,
      fullName: dto.fullName,
      honorific: dto.honorific ?? null,
      photoId: dto.photoId ? new Types.ObjectId(dto.photoId) : null,
      shortBio: dto.shortBio ?? null,
      biography: dto.biography ?? null,
      nationalityId: new Types.ObjectId(dto.nationalityId),
      publicContact: dto.publicContact
        ? { email: dto.publicContact.email ?? null, phone: dto.publicContact.phone ?? null }
        : null,
      showPublicContact: dto.showPublicContact ?? false,
      internalContact: dto.internalContact
        ? {
            personalEmail: dto.internalContact.personalEmail ?? null,
            idNumber: dto.internalContact.idNumber ?? null,
          }
        : null,
      status: dto.status,
      socialLinks: dto.socialLinks ?? [],
      cv: toPersonnelCv(dto.cv),
    });
  }

  async findAll(): Promise<FederationPersonnelDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<FederationPersonnelDocument | null> {
    return this.repository.findById(id);
  }

  /** The people behind a set of appointments, in one query rather than one
   *  per appointment. Returns fewer than asked for when some are missing or
   *  archived; a caller treats an absence as "no such person", never as an
   *  error, so one stale reference cannot fail a whole page. */
  async findByIds(ids: readonly string[]): Promise<FederationPersonnelDocument[]> {
    return this.repository.findByIds(ids);
  }

  /** Every Active person, in public-safe form — backs the public Board
   *  Members / committee listings. */
  async findAllPublic(): Promise<FederationPersonnelPublicResponseDto[]> {
    const people = await this.repository.find({ status: 'Active' });
    return people.map((person) => this.toPublicResponse(person));
  }

  /** Maps a full record to its public-safe shape (drops
   *  `internalContact`). */
  toPublicResponse(person: FederationPersonnelDocument): FederationPersonnelPublicResponseDto {
    return {
      id: person._id.toString(),
      fullName: person.fullName,
      photoId: person.photoId ? person.photoId.toString() : null,
      shortBio: person.shortBio,
      biography: person.biography,
      nationalityId: person.nationalityId.toString(),
      publicContact: person.publicContact,
      status: person.status,
      socialLinks: person.socialLinks,
    };
  }

  /**
   * Not workflow-governed (see the schema's own doc comment and
   * `WORKFLOW_ENTITY_TYPES`) — writes the row directly, like every other
   * plain-CRUD resource; no revision is created.
   *
   * `photoId`'s validity does not depend on anything this row remembers —
   * the same "exists, not archived, actually an image" check `create()`
   * runs is re-run here when it changes to a real id (Fix round 1,
   * CLAUDE.md §31), mirroring `HeroSlidesService.update()`'s established
   * convention. Clearing the photo (`photoId: null`) needs no check, same
   * as `create()`'s own `if (dto.photoId)` guard.
   *
   * `slug` is not on `UpdateFederationPersonnelDto` (omitted, per the DTO's
   * own doc comment), but a caller that sends one anyway by constructing
   * the raw body directly is still refused rather than silently ignored.
   *
   * @throws NotFoundException when no such person exists, or when `photoId`
   *   is sent as a non-null value that doesn't reference an existing,
   *   non-archived `MediaAsset`.
   * @throws ConflictException when `photoId` is sent and isn't an image type.
   * @throws BadRequestException when the body names a slug other than the
   *   one already stored.
   */
  async update(id: string, dto: UpdateFederationPersonnelDto): Promise<FederationPersonnelDocument> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Federation personnel ${id} not found.`);
    }

    const requestedSlug = (dto as unknown as { slug?: string }).slug;
    if (requestedSlug !== undefined && requestedSlug !== existing.slug) {
      throw new BadRequestException({
        code: 'slugFixed',
        message: `Federation personnel ${id}'s slug is fixed after creation.`,
      });
    }

    if (dto.photoId) {
      await this.mediaAssetsService.assertUsableImage(dto.photoId);
    }

    const update = partialUpdate(dto);
    // `photoId` defaults to `null` in the schema; `nationalityId` is
    // `required: true` (Fix round 2 — read from `federation-personnel.schema.ts`).
    setObjectIdField(update, dto, 'photoId', { nullable: true });
    setObjectIdField(update, dto, 'nationalityId', { nullable: false });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Federation personnel ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<FederationPersonnelDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<FederationPersonnelDocument | null> {
    return this.repository.restore(id);
  }

  /** @throws ConflictException when another live person holds `slug`. */
  private async assertSlugFree(slug: string, selfId: Types.ObjectId | null): Promise<void> {
    const holder = await this.repository.findOne({ slug });
    if (holder && (!selfId || (holder._id as Types.ObjectId).toString() !== selfId.toString())) {
      throw new ConflictException(`Slug "${slug}" is already in use.`);
    }
  }
}
