import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import type { FederationAppointmentDocument } from './schemas/federation-appointments.schema.js';
import { CreateFederationAppointmentDto } from './dto/create-federation-appointments.dto.js';

/** Implements: federationAppointments collection, Domain 1 — Federation &
 *  Governance. */
@Injectable()
export class FederationAppointmentsService {
  constructor(private readonly repository: FederationAppointmentsRepository) {}

  /** Explicit succession (confirmed decision #3): when
   *  `supersedesAppointmentId` is given, that ONE appointment is closed —
   *  `termEnd` set and `status` set to `Completed` — before the successor
   *  is inserted. No other appointment is touched, which is what makes this
   *  correct for multi-holder roles (BoardMember, CommitteeMember) where
   *  the old implicit roleType-based rule would have wrongly closed
   *  unrelated rows.
   *
   *  The closing `termEnd` is the successor's `termStart` — the board
   *  specifies that the superseded row gets a `termEnd` but not which
   *  date, and `termStart` is the only date in the transaction with a
   *  defined succession meaning. Flagged as a reasoned choice, not a
   *  board quote.
   *
   *  @throws NotFoundException when `supersedesAppointmentId` doesn't
   *  reference an existing appointment. */
  async create(dto: CreateFederationAppointmentDto): Promise<FederationAppointmentDocument> {
    const termStart = new Date(dto.termStart);

    if (dto.supersedesAppointmentId) {
      const superseded = await this.repository.findById(dto.supersedesAppointmentId);
      if (!superseded) {
        throw new NotFoundException(`Appointment ${dto.supersedesAppointmentId} not found.`);
      }
      await this.repository.updateById(dto.supersedesAppointmentId, {
        termEnd: termStart,
        status: 'Completed',
      });
    }

    return this.repository.create({
      personId: new Types.ObjectId(dto.personId),
      supersedesAppointmentId: dto.supersedesAppointmentId
        ? new Types.ObjectId(dto.supersedesAppointmentId)
        : null,
      roleType: dto.roleType,
      positionTitle: dto.positionTitle,
      committeeId: dto.committeeId ? new Types.ObjectId(dto.committeeId) : null,
      electionCycleId: dto.electionCycleId ? new Types.ObjectId(dto.electionCycleId) : null,
      termStart,
      termEnd: dto.termEnd ? new Date(dto.termEnd) : null,
      status: dto.status,
      displayOrder: dto.displayOrder,
    });
  }

  async findAll(): Promise<FederationAppointmentDocument[]> {
    return this.repository.find();
  }

  async findById(id: string): Promise<FederationAppointmentDocument | null> {
    return this.repository.findById(id);
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<FederationAppointmentDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
