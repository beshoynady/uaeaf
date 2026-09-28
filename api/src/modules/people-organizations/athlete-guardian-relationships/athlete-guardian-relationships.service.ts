import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { AthleteGuardianRelationshipsRepository } from './athlete-guardian-relationships.repository.js';
import type { AthleteGuardianRelationshipDocument } from './schemas/athlete-guardian-relationship.schema.js';
import { CreateAthleteGuardianRelationshipDto } from './dto/create-athlete-guardian-relationship.dto.js';
import { UpdateAthleteGuardianRelationshipDto } from './dto/update-athlete-guardian-relationship.dto.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';

/** Implements: athleteGuardianRelationships collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6088`). Plain CRUD — `guardianName` and
 *  `guardianContact` are `[RESTRICTED]`; callers of `findAll`/`findById`
 *  are expected to already be RBAC-gated at the controller layer, same as
 *  every other restricted field in this codebase (no field-level
 *  redaction here, matching established convention). */
@Injectable()
export class AthleteGuardianRelationshipsService {
  constructor(private readonly repository: AthleteGuardianRelationshipsRepository) {}

  async create(dto: CreateAthleteGuardianRelationshipDto): Promise<AthleteGuardianRelationshipDocument> {
    return this.repository.create({
      athleteId: new Types.ObjectId(dto.athleteId),
      guardianName: dto.guardianName,
      relationshipType: dto.relationshipType,
      guardianContact: {
        phone: dto.guardianContact.phone ?? null,
        email: dto.guardianContact.email ?? null,
        address: dto.guardianContact.address ?? null,
      },
      consentDocId: dto.consentDocId ? new Types.ObjectId(dto.consentDocId) : null,
      consentDate: new Date(dto.consentDate),
      isActive: dto.isActive,
    });
  }

  async findAll(): Promise<AthleteGuardianRelationshipDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<AthleteGuardianRelationshipDocument | null> {
    return this.repository.findById(id);
  }

  /** @throws NotFoundException when no such relationship exists. */
  async update(
    id: string,
    dto: UpdateAthleteGuardianRelationshipDto,
  ): Promise<AthleteGuardianRelationshipDocument> {
    const updated = await this.repository.updateById(id, partialUpdate(dto));
    if (!updated) {
      throw new NotFoundException(`Athlete guardian relationship ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<AthleteGuardianRelationshipDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<AthleteGuardianRelationshipDocument | null> {
    return this.repository.restore(id);
  }
}
