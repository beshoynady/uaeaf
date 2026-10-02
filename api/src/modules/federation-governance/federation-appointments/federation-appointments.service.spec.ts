import { jest } from '@jest/globals';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import type { Connection } from 'mongoose';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';
import { AppointmentRulesService } from './appointment-rules.service.js';
import { FederationPersonnelsService } from '../federation-personnel/federation-personnel.service.js';
import { FederationPositionsRepository } from '../federation-positions/federation-positions.repository.js';

describe('FederationAppointmentsService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
      softDelete: jest.fn(),
      findInSession: jest.fn(),
      updateByIdInSession: jest.fn(),
      createInSession: jest.fn(),
    }) as unknown as jest.Mocked<FederationAppointmentsRepository>;

  /** These cases are about succession, which never reads a person record; the
   *  personnel service is only here because the public leadership read shares
   *  this constructor. */
  const personnel = { findByIds: jest.fn(async () => []) } as unknown as FederationPersonnelsService;

  /** Stubbed rather than real: `AppointmentRulesService`'s own logic is
   *  covered by `appointment-rules.service.spec.ts` — these cases are about
   *  what `FederationAppointmentsService` does around it. */
  const rules = {
    assertAssignable: jest.fn(async () => undefined),
  } as unknown as jest.Mocked<AppointmentRulesService>;

  const defaultConnection = { startSession: jest.fn() } as unknown as Connection;

  // Unused by any case here: creation and succession never resolve a
  // position, only the public leadership read does.
  const positions = {} as unknown as FederationPositionsRepository;

  const makeService = (
    repository: jest.Mocked<FederationAppointmentsRepository>,
    connection: Connection = defaultConnection,
  ) => new FederationAppointmentsService(repository, personnel, rules, connection, positions);

  const baseDto = {
    personId: new Types.ObjectId().toString(),
    positionId: new Types.ObjectId().toString(),
    electionCycleId: new Types.ObjectId().toString(),
    termStart: '2026-01-01',
    status: 'Active' as const,
    displayOrder: 1,
  };

  describe('create', () => {
    it('creates without touching any other row when no supersedesAppointmentId is given', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = makeService(repository);

      await service.create(baseDto);

      expect(repository.findById).not.toHaveBeenCalled();
      expect(repository.updateById).not.toHaveBeenCalled();
      expect(repository.create).toHaveBeenCalledTimes(1);
    });

    it('closes exactly the superseded appointment, dated at the successor termStart', async () => {
      const repository = makeRepository();
      const supersededId = new Types.ObjectId().toString();
      repository.findById.mockResolvedValue({ _id: new Types.ObjectId(supersededId) } as never);
      repository.create.mockResolvedValue({} as never);
      const service = makeService(repository);

      await service.create({ ...baseDto, supersedesAppointmentId: supersededId });

      expect(repository.updateById).toHaveBeenCalledTimes(1);
      expect(repository.updateById).toHaveBeenCalledWith(supersededId, {
        termEnd: new Date('2026-01-01'),
        status: 'Completed',
      });
    });

    it('throws NotFoundException when the superseded appointment does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null);
      const service = makeService(repository);

      await expect(
        service.create({ ...baseDto, supersedesAppointmentId: new Types.ObjectId().toString() }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.updateById).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('never closes another open appointment implicitly (multi-holder positions stay open)', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = makeService(repository);

      // Two holders of the same position appointed independently — no supersedes pointer.
      await service.create(baseDto);
      await service.create({ ...baseDto, personId: new Types.ObjectId().toString() });

      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('refuses a positionId with no electionCycleId', async () => {
      const repository = makeRepository();
      const service = makeService(repository);

      await expect(
        service.create({ ...baseDto, electionCycleId: undefined }),
      ).rejects.toThrow('electionCycleId is required when assigning a positionId.');
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('checks assertAssignable and persists positionId when both are given', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = makeService(repository);
      const positionId = new Types.ObjectId().toString();
      const electionCycleId = new Types.ObjectId().toString();

      await service.create({ ...baseDto, positionId, electionCycleId });

      expect(rules.assertAssignable).toHaveBeenCalledWith(
        expect.objectContaining({ positionId, cycleId: electionCycleId }),
      );
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ positionId: expect.any(Types.ObjectId) }),
      );
    });
  });

  describe('close', () => {
    it('closes an appointment with a date and a reason and never deletes it', async () => {
      // build the service with its existing constructor plus the new deps
      const repository = makeRepository();
      repository.findById.mockResolvedValue({ _id: new Types.ObjectId(), termEnd: null } as never);
      repository.updateById.mockResolvedValue({} as never);
      const service = makeService(repository);

      await service.close('abc', { termEnd: '2026-01-01', endReason: 'resigned' } as never, new Types.ObjectId());

      expect(repository.updateById).toHaveBeenCalledWith(
        'abc',
        expect.objectContaining({ endReason: 'resigned', status: 'Resigned' }),
      );
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('refuses to close an appointment that is already closed', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({ _id: new Types.ObjectId(), termEnd: new Date('2025-01-01') } as never);
      const service = makeService(repository);

      await expect(
        service.close('abc', { termEnd: '2026-01-01', endReason: 'completed' } as never, new Types.ObjectId()),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('refuses to close an appointment that does not exist', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue(null as never);
      const service = makeService(repository);

      await expect(
        service.close('abc', { termEnd: '2026-01-01', endReason: 'completed' } as never, new Types.ObjectId()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('replaceChairOfCommittee', () => {
    it('closes the old chair and opens the new one inside one transaction', async () => {
      const oldChairId = new Types.ObjectId();
      const positionId = new Types.ObjectId();
      const session = {
        withTransaction: jest.fn(async (fn: () => Promise<unknown>) => fn()),
        endSession: jest.fn(),
      };
      const connection = { startSession: jest.fn(async () => session) } as unknown as Connection;
      const repository = makeRepository();
      repository.findInSession.mockResolvedValue([{ _id: oldChairId, positionId }] as never);
      repository.updateByIdInSession.mockResolvedValue({} as never);
      repository.createInSession.mockResolvedValue({} as never);
      const service = makeService(repository, connection);

      await service.replaceChairOfCommittee(
        {
          committeeId: new Types.ObjectId().toString(),
          cycleId: new Types.ObjectId().toString(),
          positionId: positionId.toString(),
          personId: new Types.ObjectId().toString(),
          termStart: '2026-01-01',
          endReason: 'transitioned',
        } as never,
        new Types.ObjectId(),
      );

      expect(session.withTransaction).toHaveBeenCalled();
      expect(repository.updateByIdInSession).toHaveBeenCalledWith(
        oldChairId.toString(),
        expect.objectContaining({ endReason: 'transitioned' }),
        session,
      );
      // The session that reads inside assertAssignable must be the SAME one
      // the close just wrote under — an un-sessioned read would see the old
      // holder as still open and refuse a capped position every time.
      expect(rules.assertAssignable).toHaveBeenCalledWith(
        expect.objectContaining({ positionId: positionId.toString() }),
        session,
      );
      expect(repository.createInSession).toHaveBeenCalled();
      expect(session.endSession).toHaveBeenCalled();

      // Order matters: the close must be visible to the cap check, and the
      // cap check must pass before the new row is created.
      const closeOrder = repository.updateByIdInSession.mock.invocationCallOrder[0];
      const checkOrder = rules.assertAssignable.mock.invocationCallOrder.at(-1) as number;
      const createOrder = repository.createInSession.mock.invocationCallOrder[0];
      expect(closeOrder).toBeLessThan(checkOrder);
      expect(checkOrder).toBeLessThan(createOrder);
    });

    it('ends the session even when the transaction throws', async () => {
      const session = {
        withTransaction: jest.fn(async () => {
          throw new ConflictException('boom');
        }),
        endSession: jest.fn(),
      };
      const connection = { startSession: jest.fn(async () => session) } as unknown as Connection;
      const service = makeService(makeRepository(), connection);

      await expect(
        service.replaceChairOfCommittee(
          {
            committeeId: new Types.ObjectId().toString(),
            cycleId: new Types.ObjectId().toString(),
            positionId: new Types.ObjectId().toString(),
            personId: new Types.ObjectId().toString(),
            termStart: '2026-01-01',
            endReason: 'transitioned',
          } as never,
          new Types.ObjectId(),
        ),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(session.endSession).toHaveBeenCalled();
    });
  });
});
