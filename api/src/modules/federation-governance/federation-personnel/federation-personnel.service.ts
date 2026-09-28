import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationPersonnelsRepository } from './federation-personnel.repository.js';
import type { FederationPersonnelDocument } from './schemas/federation-personnel.schema.js';
import { CreateFederationPersonnelDto } from './dto/create-federation-personnel.dto.js';
import { UpdateFederationPersonnelDto } from './dto/update-federation-personnel.dto.js';
import { FederationPersonnelPublicResponseDto } from './dto/federation-personnel-public-response.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import { partialUpdate, setObjectIdField } from '../../../common/utils/partial-update.util.js';

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

  async create(dto: CreateFederationPersonnelDto): Promise<FederationPersonnelDocument> {
    if (dto.photoId) {
      await this.mediaAssetsService.assertUsableImage(dto.photoId);
    }

    return this.repository.create({
      fullName: dto.fullName,
      photoId: dto.photoId ? new Types.ObjectId(dto.photoId) : null,
      shortBio: dto.shortBio ?? null,
      biography: dto.biography ?? null,
      nationalityId: new Types.ObjectId(dto.nationalityId),
      publicContact: dto.publicContact
        ? { email: dto.publicContact.email ?? null, phone: dto.publicContact.phone ?? null }
        : null,
      internalContact: dto.internalContact
        ? {
            personalEmail: dto.internalContact.personalEmail ?? null,
            idNumber: dto.internalContact.idNumber ?? null,
          }
        : null,
      status: dto.status,
      socialLinks: dto.socialLinks ?? [],
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
   * @throws NotFoundException when no such person exists, or when `photoId`
   *   is sent as a non-null value that doesn't reference an existing,
   *   non-archived `MediaAsset`.
   * @throws ConflictException when `photoId` is sent and isn't an image type.
   */
  async update(id: string, dto: UpdateFederationPersonnelDto): Promise<FederationPersonnelDocument> {
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
}
