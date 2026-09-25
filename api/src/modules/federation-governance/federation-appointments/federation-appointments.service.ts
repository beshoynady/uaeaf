import { Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import type {
  AppointmentRoleType,
  FederationAppointmentDocument,
} from './schemas/federation-appointments.schema.js';
import { CreateFederationAppointmentDto } from './dto/create-federation-appointments.dto.js';
import { FederationPersonnelsService } from '../federation-personnel/federation-personnel.service.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';

/** The roles the federation's own board is made of. Committee posts are the
 *  committees page's subject and are deliberately absent. */
const LEADERSHIP_ROLES: readonly AppointmentRoleType[] = ['President', 'BoardMember'];

/** One serving officer, in the only shape the public page receives. */
export interface LeadershipEntry {
  fullName: LocalizedText;
  positionTitle: LocalizedText;
  roleType: AppointmentRoleType;
  displayOrder: number;
  photoId: string | null;
}

/** Implements: federationAppointments collection, Domain 1 — Federation &
 *  Governance. */
@Injectable()
export class FederationAppointmentsService {
  constructor(
    private readonly repository: FederationAppointmentsRepository,
    private readonly personnel: FederationPersonnelsService,
  ) {}

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

  /** Every currently-serving appointment of a role.
   *
   *  A list rather than one document because only `President` is
   *  single-holder by convention, and that convention is not enforced by
   *  the schema — returning one would hide a data problem instead of
   *  letting the caller see it. */
  async findActiveByRole(roleType: AppointmentRoleType): Promise<FederationAppointmentDocument[]> {
    return this.repository.find({ roleType, status: 'Active' });
  }

  async findById(id: string): Promise<FederationAppointmentDocument | null> {
    return this.repository.findById(id);
  }

  /**
   * The federation's own leadership as it stands today, for the public About
   * page's panel.
   *
   * Four fields per person and no more. The personnel record carries an
   * `internalContact` block marked `[RESTRICTED]`, a biography and contact
   * details, none of which this panel prints — so the response is assembled
   * field by field rather than filtered down from the whole record, which is
   * the version that stays safe when someone later adds a field.
   *
   * "As it stands today" is three conditions together, because each alone
   * lets someone through who should not be there: the appointment is still
   * `Active`, its term has not run out, and its role is one the federation's
   * own board holds. Committee posts are the committees page's subject.
   */
  async currentLeadership(now: Date = new Date()): Promise<LeadershipEntry[]> {
    const appointments = await this.repository.find({ status: 'Active' });

    const serving = appointments
      .filter((appointment) => LEADERSHIP_ROLES.includes(appointment.roleType))
      .filter((appointment) => appointment.termEnd === null || appointment.termEnd > now)
      .sort((left, right) => left.displayOrder - right.displayOrder);

    if (serving.length === 0) {
      return [];
    }

    const people = await this.personnel.findByIds(
      serving.map((appointment) => appointment.personId.toString()),
    );
    const byId = new Map(people.map((person) => [person._id.toString(), person]));

    // An appointment whose person is gone is dropped rather than printed
    // nameless: a card with a title and no one in it reads as a mistake, and
    // it is one.
    return serving.flatMap((appointment) => {
      const person = byId.get(appointment.personId.toString());
      if (!person) {
        return [];
      }
      return [
        {
          fullName: person.fullName,
          positionTitle: appointment.positionTitle,
          roleType: appointment.roleType,
          displayOrder: appointment.displayOrder,
          photoId: person.photoId ? person.photoId.toString() : null,
        },
      ];
    });
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<FederationAppointmentDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }
}
