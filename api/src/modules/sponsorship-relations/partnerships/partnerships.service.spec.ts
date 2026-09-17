import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { PartnershipsService } from './partnerships.service.js';
import { PartnershipsRepository } from './partnerships.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';
import type { PartnershipDocument } from './schemas/partnership.schema.js';

/**
 * A partner: an organisation with a cooperation agreement (ADR-0077 D3,
 * ADR-0085 D1). Logo plus name, hidden until an editor shows it, ordered by
 * hand; a demo record never reaches the public in production.
 */
describe('PartnershipsService', () => {
  const makeRepository = () =>
    ({
      create: jest.fn(async (data: unknown) => ({ _id: new Types.ObjectId(), ...(data as object) })),
      find: jest.fn(async () => []),
      findById: jest.fn(),
      updateById: jest.fn(async (id: string, update: unknown) => ({ _id: id, ...(update as object) })),
    }) as unknown as jest.Mocked<PartnershipsRepository>;

  const makeMedia = () =>
    ({
      assertUsableImage: jest.fn(async () => undefined),
      resolvePublicImages: jest.fn(async () => new Map()),
    }) as unknown as jest.Mocked<MediaAssetsService>;

  const ready = (nodeEnv = 'development') => {
    const repository = makeRepository();
    const media = makeMedia();
    const config = { get: jest.fn(() => nodeEnv) };
    return { repository, media, service: new PartnershipsService(repository, media, config as never) };
  };

  const partner = () => ({
    partnerName: { ar: 'مؤسسة الرمال الذهبية' },
    partnershipType: 'MOU' as const,
    startDate: '2024-01-01T00:00:00.000Z',
    displayOrder: 0,
  });

  it('stores a new partnership hidden, active and undemo, with an Arabic-only name', async () => {
    const { repository, service } = ready();

    await service.create(partner());

    const written = repository.create.mock.calls[0][0] as Record<string, unknown>;
    expect(written.isVisible).toBe(false);
    expect(written.isActive).toBe(true);
    expect(written.isDemo).toBe(false);
    expect(written.partnerName).toEqual({ ar: 'مؤسسة الرمال الذهبية', en: null });
    expect(written.partnerLogoId).toBeNull();
  });

  it('refuses an end before the start', async () => {
    const { service } = ready();

    await expect(service.create({ ...partner(), endDate: '2020-01-01T00:00:00.000Z' })).rejects.toMatchObject({
      response: { code: 'sponsorshipEndsBeforeStart', field: 'endDate' },
    });
  });

  it('checks a logo is a usable image', async () => {
    const { media, service } = ready();
    const logoId = new Types.ObjectId().toString();

    await service.create({ ...partner(), partnerLogoId: logoId });

    expect(media.assertUsableImage).toHaveBeenCalledWith(logoId);
  });

  describe('findPublic', () => {
    const stored = (overrides: Partial<Record<string, unknown>>) =>
      ({
        _id: new Types.ObjectId(),
        partnerName: { ar: null, en: 'Elite Co' },
        partnerLogoId: null,
        partnershipType: 'MOU',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: null,
        isActive: true,
        displayOrder: 0,
        isVisible: true,
        isDemo: false,
        ...overrides,
      }) as unknown as PartnershipDocument;

    it('returns visible partners in display order, with the logo resolved or null', async () => {
      const { repository, media, service } = ready();
      const logoId = new Types.ObjectId();
      media.resolvePublicImages.mockResolvedValue(
        new Map([[logoId.toString(), { url: 'https://cdn/p.png', altText: { ar: 'شعار', en: 'Logo' }, width: 400, height: 400 }]]),
      );
      const second = stored({ displayOrder: 2, partnerLogoId: logoId });
      const first = stored({ displayOrder: 1 });
      repository.find.mockResolvedValue([second, stored({ isVisible: false }), first]);

      const items = await service.findPublic();

      expect(items.map((item) => item.id)).toEqual([first._id.toString(), second._id.toString()]);
      expect(items[0].logo).toBeNull();
      expect(items[1].logo?.url).toBe('https://cdn/p.png');
      expect(items[1].name).toEqual({ ar: null, en: 'Elite Co' });
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
