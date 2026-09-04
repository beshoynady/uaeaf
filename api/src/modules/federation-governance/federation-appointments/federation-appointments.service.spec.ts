import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { FederationAppointmentsService } from './federation-appointments.service.js';
import { FederationAppointmentsRepository } from './federation-appointments.repository.js';

describe('FederationAppointmentsService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(),
      findById: jest.fn(),
      updateById: jest.fn(),
    }) as unknown as jest.Mocked<FederationAppointmentsRepository>;

  const baseDto = {
    personId: new Types.ObjectId().toString(),
    roleType: 'BoardMember' as const,
    positionTitle: { en: 'Board Member', ar: 'عضو مجلس' },
    termStart: '2026-01-01',
    status: 'Active' as const,
    displayOrder: 1,
  };

  describe('create', () => {
    it('creates without touching any other row when no supersedesAppointmentId is given', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new FederationAppointmentsService(repository);

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
      const service = new FederationAppointmentsService(repository);

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
      const service = new FederationAppointmentsService(repository);

      await expect(
        service.create({ ...baseDto, supersedesAppointmentId: new Types.ObjectId().toString() }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.updateById).not.toHaveBeenCalled();
      expect(repository.create).not.toHaveBeenCalled();
    });

    it('never closes a same-roleType appointment implicitly (multi-holder roles stay open)', async () => {
      const repository = makeRepository();
      repository.create.mockResolvedValue({} as never);
      const service = new FederationAppointmentsService(repository);

      // Two BoardMembers appointed independently — no supersedes pointer.
      await service.create(baseDto);
      await service.create({ ...baseDto, personId: new Types.ObjectId().toString() });

      expect(repository.updateById).not.toHaveBeenCalled();
    });
  });
});
