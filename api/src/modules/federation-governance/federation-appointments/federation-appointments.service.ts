import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { AppointmentRulesService } from './appointment-rules.service.js';
import type {
  AppointmentEndReason,
  AppointmentStatus,
  FederationAppointmentDocument,
} from './schemas/federation-appointments.schema.js';
import { CreateFederationAppointmentDto } from './dto/create-federation-appointments.dto.js';
import { UpdateFederationAppointmentDto } from './dto/update-federation-appointments.dto.js';
import { CloseAppointmentDto } from './dto/close-appointment.dto.js';
import { ReplaceChairDto } from './dto/replace-chair.dto.js';
import { FederationPersonnelsService } from '../federation-personnel/federation-personnel.service.js';
import { FederationPositionsRepository } from '../federation-positions/federation-positions.repository.js';
import type { FederationPositionDocument } from '../federation-positions/schemas/federation-positions.schema.js';
import type { LocalizedText } from '../../../common/schemas/localized-text.schema.js';
import { partialUpdate, setObjectIdField, setDateField } from '../../../common/utils/partial-update.util.js';

// The five AppointmentEndReason values capitalize exactly onto AppointmentStatus (schema-guaranteed, not derived here).
const endReasonToStatus = (reason: AppointmentEndReason): AppointmentStatus =>
  (reason.charAt(0).toUpperCase() + reason.slice(1)) as AppointmentStatus;

/** Body of `replaceChairOfCommittee`: `ReplaceChairDto` plus the committee
 *  id, which the route reads from the path, not the request body. */
export type ReplaceChairInput = ReplaceChairDto & { committeeId: string };

/** One serving officer, in the only shape the public page receives. */
export interface LeadershipEntry {
  fullName: LocalizedText;
  positionTitle: LocalizedText;
  rank: number;
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
    private readonly rules: AppointmentRulesService,
    @InjectConnection() private readonly connection: Connection,
    private readonly positions: FederationPositionsRepository,
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

    if (!dto.electionCycleId) {
      throw new BadRequestException('electionCycleId is required when assigning a positionId.');
    }
    await this.rules.assertAssignable({
      positionId: dto.positionId,
      committeeId: dto.committeeId ?? null,
      cycleId: dto.electionCycleId,
      personId: dto.personId,
    });

    return this.repository.create({
      personId: new Types.ObjectId(dto.personId),
      positionId: new Types.ObjectId(dto.positionId),
      supersedesAppointmentId: dto.supersedesAppointmentId
        ? new Types.ObjectId(dto.supersedesAppointmentId)
        : null,
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

  /** Every position these appointments' `positionId`s resolve to, keyed by
   *  its string id — the one place an appointment's position is looked up,
   *  reused wherever its body or rank has to be read. */
  private async resolvePositions(
    appointments: readonly FederationAppointmentDocument[],
  ): Promise<Map<string, FederationPositionDocument>> {
    const ids = [...new Set(appointments.map((appointment) => appointment.positionId.toString()))];
    const positions = await this.positions.findByIds(ids);
    return new Map(positions.map((position) => [position._id.toString(), position]));
  }

  /**
   * The currently-Active appointment(s) on the board's own highest-ranked
   * post — never a name, the lowest `rank` among every `body: 'board'`
   * position that exists (rank 1 is highest by convention, but nothing here
   * assumes that number specifically: the minimum actually present
   * decides). Read from every board position, not only ones an appointment
   * currently holds — the top post being vacant right now must not make a
   * lower one read as the top.
   *
   * `isVisible` plays no part in this: it is a display toggle everywhere
   * else in this codebase, never an identity decision, and hiding the top
   * post from a listing must not silently hand the presidency to whoever
   * holds the next one down.
   *
   * This is what keeps `/about/president` from serving a board member's
   * message: a `presidentMessagePage` row pointed at any appointment other
   * than the one on this post resolves to nothing, because nothing else is
   * in the set this method returns.
   */
  async findActiveTopOfBoard(): Promise<FederationAppointmentDocument[]> {
    const [appointments, board] = await Promise.all([
      this.repository.find({ status: 'Active' }),
      this.positions.find({ body: 'board' }),
    ]);
    if (appointments.length === 0 || board.length === 0) {
      return [];
    }

    const topRank = Math.min(...board.map((position) => position.rank));
    const topPositionIds = new Set(
      board.filter((position) => position.rank === topRank).map((position) => position._id.toString()),
    );

    return appointments.filter((appointment) => topPositionIds.has(appointment.positionId.toString()));
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
   * `Active`, its term has not run out, and its position's `body` is
   * `'board'` — never a name. Committee posts are the committees page's
   * subject.
   */
  async currentLeadership(now: Date = new Date()): Promise<LeadershipEntry[]> {
    const appointments = await this.repository.find({ status: 'Active' });
    const inTerm = appointments.filter(
      (appointment) => appointment.termEnd === null || appointment.termEnd > now,
    );

    if (inTerm.length === 0) {
      return [];
    }

    const positionById = await this.resolvePositions(inTerm);

    const serving = inTerm
      .flatMap((appointment) => {
        const position = positionById.get(appointment.positionId.toString());
        return position && position.body === 'board' ? [{ appointment, position }] : [];
      })
      .sort(
        (left, right) =>
          left.position.rank - right.position.rank || left.appointment.displayOrder - right.appointment.displayOrder,
      );

    if (serving.length === 0) {
      return [];
    }

    const people = await this.personnel.findByIds(
      serving.map(({ appointment }) => appointment.personId.toString()),
    );
    const byId = new Map(people.map((person) => [person._id.toString(), person]));

    // An appointment whose person is gone is dropped rather than printed
    // nameless: a card with a title and no one in it reads as a mistake, and
    // it is one.
    return serving.flatMap(({ appointment, position }) => {
      const person = byId.get(appointment.personId.toString());
      if (!person) {
        return [];
      }
      return [
        {
          fullName: person.fullName,
          positionTitle: position.title,
          rank: position.rank,
          displayOrder: appointment.displayOrder,
          photoId: person.photoId ? person.photoId.toString() : null,
        },
      ];
    });
  }

  /** The succession side-effect `create()` runs (closing the superseded
   *  row) is not re-run here — this edits one appointment's own fields.
   *  Nullability (Fix round 2 — read from `federation-appointments.schema.ts`):
   *  `personId`/`termStart` are `required: true`; `supersedesAppointmentId`/
   *  `committeeId`/`electionCycleId`/`termEnd` all default to `null`.
   *  @throws NotFoundException when no such appointment exists. */
  async update(id: string, dto: UpdateFederationAppointmentDto): Promise<FederationAppointmentDocument> {
    const update = partialUpdate(dto);
    setObjectIdField(update, dto, 'personId', { nullable: false });
    setObjectIdField(update, dto, 'supersedesAppointmentId', { nullable: true });
    setObjectIdField(update, dto, 'committeeId', { nullable: true });
    setObjectIdField(update, dto, 'electionCycleId', { nullable: true });
    setDateField(update, dto, 'termStart', { nullable: false });
    setDateField(update, dto, 'termEnd', { nullable: true });
    const updated = await this.repository.updateById(id, update);
    if (!updated) {
      throw new NotFoundException(`Federation appointment ${id} not found.`);
    }
    return updated;
  }

  async remove(id: string, archivedBy: Types.ObjectId): Promise<FederationAppointmentDocument | null> {
    return this.repository.softDelete(id, archivedBy);
  }

  async unarchive(id: string): Promise<FederationAppointmentDocument | null> {
    return this.repository.restore(id);
  }

  /** Closes a term with a date and a reason — no re-closing, no delete path.
   *  @throws NotFoundException when no such appointment exists.
   *  @throws ConflictException when it is already closed. */
  async close(
    id: string,
    dto: CloseAppointmentDto,
    by: Types.ObjectId,
  ): Promise<FederationAppointmentDocument> {
    const appointment = await this.repository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Federation appointment ${id} not found.`);
    }
    if (appointment.termEnd !== null) {
      throw new ConflictException(`Federation appointment ${id} is already closed.`);
    }

    const updated = await this.repository.updateById(id, {
      termEnd: new Date(dto.termEnd),
      endReason: dto.endReason,
      status: endReasonToStatus(dto.endReason),
      updatedBy: by,
    });
    if (!updated) {
      throw new NotFoundException(`Federation appointment ${id} not found.`);
    }
    return updated;
  }

  /**
   * Closes every open appointment on `dto.positionId`/`dto.cycleId` inside
   * `dto.committeeId`, then opens the new one — one transaction, closing
   * before `assertAssignable` so the freed seat is visible to the cap check.
   */
  async replaceChairOfCommittee(
    dto: ReplaceChairInput,
    by: Types.ObjectId,
  ): Promise<FederationAppointmentDocument> {
    const session = await this.connection.startSession();
    try {
      return await session.withTransaction(async () => {
        const termEnd = new Date(dto.termStart);
        const open = await this.repository.findInSession(
          {
            committeeId: new Types.ObjectId(dto.committeeId),
            positionId: new Types.ObjectId(dto.positionId),
            electionCycleId: new Types.ObjectId(dto.cycleId),
            termEnd: null,
          },
          session,
        );
        for (const holder of open) {
          await this.repository.updateByIdInSession(
            holder._id.toString(),
            {
              termEnd,
              endReason: dto.endReason,
              status: endReasonToStatus(dto.endReason),
              updatedBy: by,
            },
            session,
          );
        }

        await this.rules.assertAssignable(
          {
            positionId: dto.positionId,
            committeeId: dto.committeeId,
            cycleId: dto.cycleId,
            personId: dto.personId,
          },
          session,
        );

        return this.repository.createInSession(
          {
            personId: new Types.ObjectId(dto.personId),
            positionId: new Types.ObjectId(dto.positionId),
            committeeId: new Types.ObjectId(dto.committeeId),
            electionCycleId: new Types.ObjectId(dto.cycleId),
            supersedesAppointmentId: null,
            termStart: new Date(dto.termStart),
            termEnd: null,
            status: 'Active',
            displayOrder: dto.displayOrder,
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
