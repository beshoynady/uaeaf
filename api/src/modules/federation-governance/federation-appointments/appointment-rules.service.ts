import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import type { ClientSession, QueryFilter } from 'mongoose';
import { FederationPositionsRepository } from '../federation-positions/federation-positions.repository.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import type { FederationAppointmentDocument } from './schemas/federation-appointments.schema.js';

/** The one place an appointment's position, body and cap are judged, so a
 *  bad assignment cannot reach the collection from any of the routes that
 *  create or replace one. */
@Injectable()
export class AppointmentRulesService {
  constructor(
    private readonly positions: FederationPositionsRepository,
    private readonly appointments: FederationAppointmentsRepository,
  ) {}

  /** @param session joins `replaceChairOfCommittee`'s transaction so its own
   *  close is visible to this read; a session-less `create()` omits it.
   *  @throws BadRequestException a body/committee mismatch. @throws ConflictException a full post or a duplicate holder. */
  assertAssignable = async (
    input: {
      positionId: string;
      committeeId: string | null;
      cycleId: string;
      personId: string;
    },
    session?: ClientSession,
  ): Promise<void> => {
    const position = session
      ? await this.positions.findByIdInSession(input.positionId, session)
      : await this.positions.findById(input.positionId);
    if (!position) throw new BadRequestException('That position no longer exists.');

    const wantsCommittee = position.body === 'committee';
    if (wantsCommittee !== Boolean(input.committeeId)) {
      throw new BadRequestException(
        wantsCommittee
          ? 'A committee position must name its committee.'
          : 'A board position cannot be assigned inside a committee.',
      );
    }

    const scope = {
      electionCycleId: new Types.ObjectId(input.cycleId),
      committeeId: input.committeeId ? new Types.ObjectId(input.committeeId) : null,
      termEnd: null,
    } as QueryFilter<FederationAppointmentDocument>;

    const readAppointments = (filter: QueryFilter<FederationAppointmentDocument>) =>
      session ? this.appointments.findInSession(filter, session) : this.appointments.find(filter);

    if (input.committeeId) {
      const held = await readAppointments(scope);
      if (held.some((appointment) => appointment.personId.toString() === input.personId)) {
        throw new ConflictException('That person already holds a post in this committee for this cycle.');
      }
    }

    if (position.maxHolders !== null) {
      const onPost = await readAppointments({ ...scope, positionId: position._id } as QueryFilter<FederationAppointmentDocument>);
      if (onPost.length >= position.maxHolders) {
        throw new ConflictException(`That position already has its ${position.maxHolders} holder(s) for this cycle.`);
      }
    }
  };
}
