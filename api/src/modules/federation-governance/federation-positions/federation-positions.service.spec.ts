import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import type { Model } from 'mongoose';
import { ConflictException } from '@nestjs/common';
import { FederationPositionsService } from './federation-positions.service.js';
import { FederationPositionsRepository } from './federation-positions.repository.js';
import type { FederationAppointmentDocument } from '../federation-appointments/schemas/federation-appointments.schema.js';

const makeRepository = () =>
  ({ create: jest.fn(), find: jest.fn(), findById: jest.fn(), updateById: jest.fn(), softDelete: jest.fn(), restore: jest.fn() }) as unknown as jest.Mocked<FederationPositionsRepository>;

/** The guard reads `federationAppointments` through the raw Mongoose model
 *  rather than a repository (controller ruling: `FederationPositionsModule`
 *  must not import `FederationAppointmentsModule`, to avoid a cycle), so the
 *  test mocks the same `find().exec()` chain the service calls. */
const makeAppointmentModel = () => {
  const exec = jest.fn<() => Promise<{ _id: Types.ObjectId }[]>>();
  const find = jest.fn<(filter: unknown) => { exec: typeof exec }>(() => ({ exec }));
  return { find, exec, model: { find } as unknown as jest.Mocked<Model<FederationAppointmentDocument>> };
};

describe('FederationPositionsService', () => {
  it('refuses to archive a position that still has open appointments', async () => {
    const positions = makeRepository();
    const { find, exec, model } = makeAppointmentModel();
    const id = new Types.ObjectId();
    positions.findById.mockResolvedValue({ _id: id } as never);
    exec.mockResolvedValue([{ _id: new Types.ObjectId() }]);
    const service = new FederationPositionsService(positions, model);

    // Exercised through archive(), not assertArchivable() alone, so
    // "softDelete not called" is a real check rather than one that would
    // hold no matter what assertArchivable does — assertArchivable itself
    // never calls softDelete either way.
    await expect(service.archive(id.toString(), new Types.ObjectId())).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(find).toHaveBeenCalled();
    expect(positions.softDelete).not.toHaveBeenCalled();
  });

  it('allows archiving once every appointment on the position is closed', async () => {
    const positions = makeRepository();
    const { exec, model } = makeAppointmentModel();
    const id = new Types.ObjectId();
    positions.findById.mockResolvedValue({ _id: id } as never);
    exec.mockResolvedValue([]);
    const service = new FederationPositionsService(positions, model);

    await expect(service.assertArchivable(id.toString())).resolves.toBeUndefined();
  });

  it('asks for open appointments only, so a closed term never blocks archiving', async () => {
    const positions = makeRepository();
    const { find, exec, model } = makeAppointmentModel();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId() } as never);
    exec.mockResolvedValue([]);
    const service = new FederationPositionsService(positions, model);

    await service.assertArchivable(new Types.ObjectId().toString());

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ termEnd: null }));
  });

  it('asks for live appointments only, so an archived one never blocks archiving', async () => {
    const positions = makeRepository();
    const { find, exec, model } = makeAppointmentModel();
    positions.findById.mockResolvedValue({ _id: new Types.ObjectId() } as never);
    exec.mockResolvedValue([]);
    const service = new FederationPositionsService(positions, model);

    await service.assertArchivable(new Types.ObjectId().toString());

    expect(find).toHaveBeenCalledWith(expect.objectContaining({ archivedAt: null }));
  });

  it('stores maxHolders as null when the admin leaves it empty', async () => {
    const positions = makeRepository();
    positions.create.mockResolvedValue({} as never);
    const { model } = makeAppointmentModel();
    const service = new FederationPositionsService(positions, model);

    await service.create({ title: { ar: 'أ', en: 'A' }, body: 'board', rank: 1, displayOrder: 0 } as never);

    expect(positions.create).toHaveBeenCalledWith(expect.objectContaining({ maxHolders: null, isVisible: true }));
  });

  it('keeps an explicit maxHolders and isVisible instead of overriding them with the defaults', async () => {
    const positions = makeRepository();
    positions.create.mockResolvedValue({} as never);
    const { model } = makeAppointmentModel();
    const service = new FederationPositionsService(positions, model);

    await service.create({
      title: { ar: 'أ', en: 'A' },
      body: 'committee',
      rank: 2,
      displayOrder: 1,
      maxHolders: 3,
      isVisible: false,
    } as never);

    expect(positions.create).toHaveBeenCalledWith(expect.objectContaining({ maxHolders: 3, isVisible: false }));
  });
});
