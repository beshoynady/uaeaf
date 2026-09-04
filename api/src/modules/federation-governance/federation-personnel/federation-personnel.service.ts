import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationPersonnelsRepository } from './federation-personnel.repository.js';
import type { FederationPersonnelDocument } from './schemas/federation-personnel.schema.js';
import { CreateFederationPersonnelDto } from './dto/create-federation-personnel.dto.js';
import { FederationPersonnelPublicResponseDto } from './dto/federation-personnel-public-response.dto.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

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

  async remove(id: string, archivedBy: Types.ObjectId): Promise<FederationPersonnelDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
