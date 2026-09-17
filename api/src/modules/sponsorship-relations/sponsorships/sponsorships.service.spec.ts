import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { SponsorshipsService } from './sponsorships.service.js';
import { SponsorshipsRepository } from './sponsorships.repository.js';
import { SponsorsService } from '../sponsors/sponsors.service.js';
import { FederationsService } from '../../federation-governance/federation/federation.service.js';
import type { SponsorshipDocument } from './schemas/sponsorship.schema.js';

/**
 * The contract between the federation and a sponsor (ADR-0077 D2, ADR-0085
 * D1). A new one is hidden; its window is two Dubai calendar days; an event
 * sponsorship must end; the system never writes `Expired` — expiry is asked
 * at read time; and in production a demo record never reaches the public.
 */
describe('SponsorshipsService', () => {
  const federationId = new Types.ObjectId();
  const sponsorId = new Types.ObjectId();

  const makeRepository = () =>
    ({
      create: jest.fn(async (data: unknown) => ({ _id: new Types.ObjectId(), ...(data as object) })),
      find: jest.fn(async () => []),
      findById: jest.fn(),
      updateById: jest.fn(async (id: string, update: unknown) => ({ _id: id, ...(update as object) })),
    }) as unknown as jest.Mocked<SponsorshipsRepository>;

  const makeSponsors = () =>
    ({
      findById: jest.fn(async (id: string) => (id === sponsorId.toString() ? { _id: sponsorId } : null)),
      findByIds: jest.fn(async () => [{ _id: sponsorId, name: { ar: null, en: 'Ultimate Power Solution' }, logoId: null, website: null, categoryLabel: null }]),
      toPublicResponses: jest.fn(async (sponsors: { _id: Types.ObjectId }[]) =>
        sponsors.map((sponsor) => ({ id: sponsor._id.toString(), name: { ar: null, en: 'Ultimate Power Solution' }, logo: null, website: null, categoryLabel: null })),
      ),
    }) as unknown as jest.Mocked<SponsorsService>;

  const makeFederations = () =>
    ({
      findAll: jest.fn(async () => [{ _id: federationId }]),
    }) as unknown as jest.Mocked<FederationsService>;

  const ready = (nodeEnv = 'development') => {
    const repository = makeRepository();
    const sponsors = makeSponsors();
    const federations = makeFederations();
    const config = { get: jest.fn(() => nodeEnv) };
    return { repository, sponsors, federations, service: new SponsorshipsService(repository, sponsors, federations, config as never) };
  };

  const federationSponsorship = () => ({
    sponsorId: sponsorId.toString(),
    targetType: 'Federation' as const,
    tier: 'Official' as const,
    startDate: '2026-08-31T20:00:00.000Z',
    displayOrder: 0,
  });

  it('stores a new sponsorship hidden, Active and undemo when the request does not say', async () => {
    const { repository, service } = ready();

    await service.create(federationSponsorship());

    const written = repository.create.mock.calls[0][0] as { isVisible: boolean; status: string; isDemo: boolean; endDate: unknown };
    expect(written.isVisible).toBe(false);
    expect(written.status).toBe('Active');
    expect(written.isDemo).toBe(false);
    expect(written.endDate).toBeNull();
  });

  it('refuses a sponsor that does not exist', async () => {
    const { service } = ready();

    await expect(service.create({ ...federationSponsorship(), sponsorId: new Types.ObjectId().toString() })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses an end before the start', async () => {
    const { service } = ready();

    await expect(
      service.create({ ...federationSponsorship(), endDate: '2026-01-01T00:00:00.000Z' }),
    ).rejects.toMatchObject({ response: { code: 'sponsorshipEndsBeforeStart', field: 'endDate' } });
  });

  it('requires an end for a championship or event sponsorship, and accepts an empty targetId for them', async () => {
    const { repository, service } = ready();

    await expect(service.create({ ...federationSponsorship(), targetType: 'Championship' })).rejects.toMatchObject({
      response: { code: 'sponsorshipEndRequired', field: 'endDate' },
    });

    await service.create({ ...federationSponsorship(), targetType: 'Event', endDate: '2027-01-01T00:00:00.000Z' });
    expect((repository.create.mock.calls[0][0] as { targetId: unknown }).targetId).toBeNull();
  });

  it('accepts a Federation sponsorship whose targetId is the federation, or empty, and refuses any other id', async () => {
    const { repository, service } = ready();

    await service.create({ ...federationSponsorship(), targetId: federationId.toString() });
    await service.create(federationSponsorship());
    expect((repository.create.mock.calls[0][0] as { targetId: Types.ObjectId }).targetId.toString()).toBe(federationId.toString());
    expect((repository.create.mock.calls[1][0] as { targetId: unknown }).targetId).toBeNull();

    await expect(service.create({ ...federationSponsorship(), targetId: new Types.ObjectId().toString() })).rejects.toMatchObject({
      response: { code: 'invalidSponsorshipTarget', field: 'targetId' },
    });
  });

  it('keeps a bilingual scope label within 120 characters a side', async () => {
    const { service } = ready();

    await expect(
      service.create({ ...federationSponsorship(), scopeLabel: { ar: 'ا'.repeat(121), en: 'Official sponsor' } }),
    ).rejects.toMatchObject({ response: { field: 'scopeLabel.ar' } });
  });

  it('checks the merged window on update, not the body alone', async () => {
    const { repository, service } = ready();
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      sponsorId,
      targetType: 'Federation',
      targetId: null,
      startDate: new Date('2026-08-31T20:00:00.000Z'),
      endDate: null,
      status: 'Active',
    } as unknown as SponsorshipDocument);

    await expect(service.update('any', { endDate: '2026-01-01T00:00:00.000Z' })).rejects.toMatchObject({
      response: { code: 'sponsorshipEndsBeforeStart' },
    });
  });

  it('never writes Expired itself: status changes only when a request sends one', async () => {
    const { repository, service } = ready();
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(),
      sponsorId,
      targetType: 'Federation',
      targetId: null,
      startDate: new Date('2020-01-01T00:00:00.000Z'),
      endDate: new Date('2021-01-01T00:00:00.000Z'),
      status: 'Active',
    } as unknown as SponsorshipDocument);

    await service.update('any', { displayOrder: 3 });

    expect(repository.updateById.mock.calls[0][1]).not.toHaveProperty('status');
  });

  describe('findPublic', () => {
    const stored = (overrides: Partial<Record<string, unknown>>) =>
      ({
        _id: new Types.ObjectId(),
        sponsorId,
        targetType: 'Federation',
        targetId: null,
        tier: 'Official',
        startDate: new Date('2026-08-31T20:00:00.000Z'),
        endDate: new Date('2027-08-31T19:59:59.000Z'),
        status: 'Active',
        scopeLabel: null,
        isFeatured: false,
        displayOrder: 0,
        isVisible: true,
        isDemo: false,
        ...overrides,
      }) as unknown as SponsorshipDocument;

    it('returns only visible, uncancelled sponsorships inside their Dubai window, in display order', async () => {
      const { repository, service } = ready();
      const second = stored({ displayOrder: 2 });
      const first = stored({ displayOrder: 1 });
      repository.find.mockResolvedValue([
        second,
        stored({ isVisible: false }),
        stored({ status: 'Cancelled' }),
        stored({ endDate: new Date('2026-12-31T19:59:59.000Z') }),
        first,
      ]);

      const items = await service.findPublic(new Date('2027-03-01T00:00:00.000Z'));

      expect(items.map((item) => item.id)).toEqual([first._id.toString(), second._id.toString()]);
      expect(items[0].sponsor.name).toEqual({ ar: null, en: 'Ultimate Power Solution' });
    });

    it('shows demo records outside production and hides them in production', async () => {
      const demo = stored({ isDemo: true });
      const real = stored({});
      const now = new Date('2027-03-01T00:00:00.000Z');

      const dev = ready('development');
      dev.repository.find.mockResolvedValue([demo, real]);
      expect((await dev.service.findPublic(now)).map((item) => item.id)).toEqual([demo._id.toString(), real._id.toString()]);

      const prod = ready('production');
      prod.repository.find.mockResolvedValue([demo, real]);
      expect((await prod.service.findPublic(now)).map((item) => item.id)).toEqual([real._id.toString()]);
    });

    it('drops a sponsorship whose sponsor is gone rather than sending a nameless card', async () => {
      const { repository, sponsors, service } = ready();
      repository.find.mockResolvedValue([stored({ sponsorId: new Types.ObjectId() })]);
      sponsors.findByIds.mockResolvedValue([]);
      sponsors.toPublicResponses.mockResolvedValue([]);

      expect(await service.findPublic(new Date('2027-03-01T00:00:00.000Z'))).toEqual([]);
    });
  });
});
