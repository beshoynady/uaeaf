import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Model, QueryFilter } from 'mongoose';
import { FederationPositionsRepository } from './federation-positions.repository.js';
import type { FederationPositionDocument } from './schemas/federation-positions.schema.js';
import { CreateFederationPositionDto } from './dto/create-federation-positions.dto.js';
import { UpdateFederationPositionDto } from './dto/update-federation-positions.dto.js';
import { FederationAppointment } from '../federation-appointments/schemas/federation-appointments.schema.js';
import type { FederationAppointmentDocument } from '../federation-appointments/schemas/federation-appointments.schema.js';
import { partialUpdate } from '../../../common/utils/partial-update.util.js';

/** Implements: federationPositions collection, Domain 1 — Federation &
 *  Governance. Reads `federationAppointments` through its raw model for
 *  the archive guard below. */
@Injectable()
export class FederationPositionsService {
  constructor(
    private readonly repository: FederationPositionsRepository,
    @InjectModel(FederationAppointment.name)
    private readonly appointmentModel: Model<FederationAppointmentDocument>,
  ) {}

  async create(dto: CreateFederationPositionDto): Promise<FederationPositionDocument> {
    return this.repository.create({
      title: dto.title,
      body: dto.body,
      rank: dto.rank,
      displayOrder: dto.displayOrder,
      maxHolders: dto.maxHolders ?? null,
      isVisible: dto.isVisible ?? true,
    });
  }

  async findAll(): Promise<FederationPositionDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<FederationPositionDocument | null> {
    return this.repository.findById(id);
  }

  /** @throws NotFoundException when no such position exists. */
  async update(id: string, dto: UpdateFederationPositionDto): Promise<FederationPositionDocument> {
    const updated = await this.repository.updateById(id, partialUpdate(dto));
    if (!updated) {
      throw new NotFoundException(`Federation position ${id} not found.`);
    }
    return updated;
  }

  /** @throws ConflictException when the post still has an open appointment. */
  async assertArchivable(id: string): Promise<void> {
    const open = await this.appointmentModel
      .find({
        positionId: new Types.ObjectId(id),
        termEnd: null,
        archivedAt: null,
      } as QueryFilter<FederationAppointmentDocument>)
      .exec();
    if (open.length > 0) {
      throw new ConflictException(`Position ${id} still has ${open.length} open appointment(s).`);
    }
  }

  async archive(id: string, archivedBy: Types.ObjectId): Promise<FederationPositionDocument | null> {
    await this.assertArchivable(id);
    return this.repository.softDelete(id, archivedBy);
  }

  async restore(id: string): Promise<FederationPositionDocument | null> {
    return this.repository.restore(id);
  }
}
