import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { MembershipsService } from './memberships.service.js';
import { MembershipsRepository } from './memberships.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import type { MembershipDocument } from './schemas/membership.schema.js';

/**
 * A membership: a body the federation belongs to (ADR-0037, ADR-0077 D3,
 * ADR-0085 D1). Never merged with sponsors; logo plus name; hidden until
 * shown; a demo record never reaches the public in production.
 */
describe('MembershipsService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(async (data: unknown) => ({ _id: new Types.ObjectId(), ...(data as object) })),
      find: jest.fn(async () => []),
      findById: jest.fn(),
      updateById: jest.fn(async (id: string, update: unknown) => ({ _id: id, ...(update as object) })),
    }) as unknown as jest.Mocked<MembershipsRepository>;

  const makeMedia = () =>
    ({
      assertUsableImage: jest.fn(async () => undefined),
      resolvePublicImages: jest.fn(async () => new Map()),
    }) as unknown as jest.Mocked<MediaAssetsService>;

  const ready = (nodeEnv = 'development') => {
    const repository = makeRepository();
    const media = makeMedia();
    const config = { get: jest.fn(() => nodeEnv) };
    return { repository, media, service: new MembershipsService(repository, media, config as never) };
  };

  const membership = () => ({
    organizationName: { ar: 'الاتحاد القاري التجريبي', en: 'Demo Continental Federation' },
    membershipType: 'ContinentalBody' as const,
    startDate: '1990-01-01T00:00:00.000Z',
    displayOrder: 0,
  });

  it('stores a new membership hidden, Active and undemo', async () => {
    const { repository, service } = ready();

    await service.create(membership());

    const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
    expect(written.isVisible).toBe(false);
    expect(written.status).toBe('Active');
    expect(written.isDemo).toBe(false);
    expect(written.organizationName).toEqual({ ar: 'الاتحاد القاري التجريبي', en: 'Demo Continental Federation' });
  });

  it('refuses a membership with no name', async () => {
    const { service } = ready();

    await expect(service.create({ ...membership(), organizationName: {} })).rejects.toMatchObject({
      response: { code: 'missingRequiredField', field: 'organizationName' },
    });
  });

  describe('findPublic', () => {
    const stored = (overrides: Partial<Record<string, unknown>>) =>
      ({
        _id: new Types.ObjectId(),
        organizationName: { ar: 'الاتحاد القاري التجريبي', en: null },
        organizationLogoId: null,
        membershipType: 'ContinentalBody',
        startDate: new Date('1990-01-01T00:00:00.000Z'),
        endDate: null,
        status: 'Active',
        displayOrder: 0,
        isVisible: true,
        isDemo: false,
        ...overrides,
      }) as unknown as MembershipDocument;

    it('returns visible memberships in display order and hides the rest', async () => {
      const { repository, service } = ready();
      const second = stored({ displayOrder: 2 });
      const first = stored({ displayOrder: 1 });
      repository.find.mockResolvedValue([second, stored({ isVisible: false }), first]);

      const items = await service.findPublic();

      expect(items.map((item) => item.id)).toEqual([first._id.toString(), second._id.toString()]);
      expect(items[0]).toEqual({
        id: first._id.toString(),
        name: { ar: 'الاتحاد القاري التجريبي', en: null },
        logo: null,
        displayOrder: 1,
      });
    });

    it('hides demo records in production only', async () => {
      const demo = stored({ isDemo: true });

      const dev = ready('development');
      dev.repository.find.mockResolvedValue([demo]);
      expect(await dev.service.findPublic()).toHaveLength(1);

      const prod = ready('production');
      prod.repository.find.mockResolvedValue([demo]);
      expect(await prod.service.findPublic()).toHaveLength(0);
    });
  });
});
