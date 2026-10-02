import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AppointmentRulesService } from './appointment-rules.service.js';
import { FederationPositionsRepository } from '../federation-positions/federation-positions.repository.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';

const id = () => new Types.ObjectId().toString();
const makePositions = () => ({ findById: jest.fn() }) as unknown as jest.Mocked<FederationPositionsRepository>;
const makeAppointments = () => ({ find: jest.fn() }) as unknown as jest.Mocked<FederationAppointmentsRepository>;

describe('AppointmentRulesService.assertAssignable', () => {
  it('refuses a board position assigned inside a committee', async () => {
    const positions = makePositions();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'board', maxHolders: null } as never);
    const service = new AppointmentRulesService(positions, makeAppointments());

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: id(), cycleId: id(), personId: id() }),
    ).rejects.toThrow('A board position cannot be assigned inside a committee.');
  });

  it('refuses a committee position assigned with no committee', async () => {
    const positions = makePositions();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'committee', maxHolders: null } as never);
    const service = new AppointmentRulesService(positions, makeAppointments());

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() }),
    ).rejects.toThrow('A committee position must name its committee.');
  });

  it('refuses an assignment beyond maxHolders in the same cycle and body', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'board', maxHolders: 1 } as never);
    appointments.find.mockResolvedValue([{ personId: new Types.ObjectId() }] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('counts open appointments only, so a closed term frees the seat', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'board', maxHolders: 1 } as never);
    appointments.find.mockResolvedValue([] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() });

    expect(appointments.find).toHaveBeenCalledWith(expect.objectContaining({ termEnd: null }));
  });

  it('refuses the same person twice in one committee in one cycle', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    const person = id();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'committee', maxHolders: null } as never);
    appointments.find.mockResolvedValue([{ personId: new Types.ObjectId(person) }] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: id(), cycleId: id(), personId: person }),
    ).rejects.toThrow('That person already holds a post in this committee for this cycle.');
  });

  it('allows a different person in the same committee and cycle', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'committee', maxHolders: null } as never);
    appointments.find.mockResolvedValue([{ personId: new Types.ObjectId() }] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: id(), cycleId: id(), personId: id() }),
    ).resolves.toBeUndefined();
  });

  it('refuses an assignment to a position that no longer exists', async () => {
    const positions = makePositions();
    positions.findById.mockResolvedValue(null as never);
    const service = new AppointmentRulesService(positions, makeAppointments());

    await expect(
      service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() }),
    ).rejects.toThrow('That position no longer exists.');
  });

  it('ignores maxHolders when it is null', async () => {
    const positions = makePositions();
    const appointments = makeAppointments();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId(), body: 'board', maxHolders: null } as never);
    appointments.find.mockResolvedValue([] as never);
    const service = new AppointmentRulesService(positions, appointments);

    await service.assertAssignable({ positionId: id(), committeeId: null, cycleId: id(), personId: id() });

    // Only the duplicate-person scope query runs for a committee; a board post
    // with no cap asks nothing about how many already hold it.
    expect(appointments.find).not.toHaveBeenCalledWith(expect.objectContaining({ positionId: expect.anything() }));
  });
});
