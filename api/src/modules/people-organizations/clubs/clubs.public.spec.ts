import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { ClubsService } from './clubs.service.js';
import { ClubsRepository } from './clubs.repository.js';
import type { ClubDocument } from './schemas/club.schema.js';

/**
 * The public club shape exists for one caller: the albums filter, which needs
 * a name to draw and an id to filter by. Everything else a club record holds —
 * its registration number, its address, its email and phone, its founding date
 * — is administrative, and an endpoint anyone can call has no business
 * carrying it.
 *
 * The shape is built field by field rather than by deleting keys from the
 * document, which is what makes the guarantee structural: a field added to the
 * schema later cannot appear here by default.
 */
describe('ClubsService.findAllPublic', () => {
  const makeClub = (overrides: Partial<ClubDocument> = {}) =>
    ({
      _id: new Types.ObjectId(),
      name: { en: 'Al Ain Club', ar: 'نادي العين' },
      slug: 'al-ain',
      logoId: new Types.ObjectId(),
      status: 'Active',
      registrationNumber: 'REG-001',
      email: 'club@example.com',
      phone: '+971500000000',
      address: { en: 'Somewhere', ar: 'مكان' },
      foundingDate: new Date('1990-01-01'),
      emirateId: new Types.ObjectId(),
      ...overrides,
    }) as unknown as ClubDocument;

  const makeRepository = (clubs: ClubDocument[]) =>
    ({ findPaginated: jest.fn(async () => ({ items: clubs, total: clubs.length })) }) as unknown as ClubsRepository;

  it('returns only name, slug and logoId for each club', async () => {
    const service = new ClubsService(makeRepository([makeClub()]));

    const result = await service.findAllPublic();

    expect(Object.keys(result.items[0]).sort()).toEqual(['id', 'logoId', 'name', 'slug']);
  });

  it('carries no administrative field, whatever the document holds', async () => {
    const service = new ClubsService(makeRepository([makeClub()]));

    const [club] = (await service.findAllPublic()).items;

    for (const leaked of ['registrationNumber', 'email', 'phone', 'address', 'foundingDate', 'emirateId', 'status']) {
      expect(club).not.toHaveProperty(leaked);
    }
  });

  it('reports a club with no logo as null rather than omitting the key', async () => {
    const service = new ClubsService(makeRepository([makeClub({ logoId: null })]));

    expect((await service.findAllPublic()).items[0].logoId).toBeNull();
  });

  it('asks the repository for active clubs only', async () => {
    const repository = makeRepository([makeClub()]);
    const service = new ClubsService(repository);

    await service.findAllPublic();

    expect(repository.findPaginated).toHaveBeenCalledWith(0, expect.any(Number), { status: 'Active' });
  });
});
