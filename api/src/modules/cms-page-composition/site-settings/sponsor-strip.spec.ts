import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { SiteSettingsService } from './site-settings.service.js';
import { SiteSettingsRepository } from './site-settings.repository.js';
import { SPONSOR_STRIP_DEFAULTS, normalizeSponsorStrip } from './schemas/sponsor-strip.schema.js';

/**
 * The global sponsor strip's settings (ADR-0077 D5, ADR-0085 D7), stored on
 * the `siteSettings` singleton and written through their own route, so saving
 * the strip never resets the footer or the SEO defaults — and the reverse.
 */
describe('sponsor strip settings', () => {
  const makeRepository = () =>
    ({
      findOne: jest.fn(async () => ({ _id: new Types.ObjectId() })),
      create: jest.fn(async (data: unknown) => data),
      updateById: jest.fn(async (_id: string, data: unknown) => data),
    }) as unknown as jest.Mocked<SiteSettingsRepository>;

  const ready = () => {
    const repository = makeRepository();
    return { repository, service: new SiteSettingsService(repository, { assertUsableImage: jest.fn() } as never) };
  };

  it('reads as the owner\'s defaults when nothing is stored: visible, logo + name, every running sponsor, by tier, top tier pinned, medium speed', () => {
    expect(normalizeSponsorStrip(undefined)).toEqual({
      isVisible: true,
      displayMode: 'logoName',
      selection: 'allActive',
      sponsorshipIds: [],
      order: 'tier',
      pinnedSponsorshipId: null,
      speed: 'medium',
    });
    expect(SPONSOR_STRIP_DEFAULTS.displayMode).toBe('logoName');
  });

  it('writes the strip alone, never the other settings', async () => {
    const { repository, service } = ready();

    await service.upsertSponsorStrip({ ...SPONSOR_STRIP_DEFAULTS, speed: 'slow' });

    const written = repository.updateById.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(written)).toEqual(['sponsorStrip']);
    expect((written.sponsorStrip as { speed: string }).speed).toBe('slow');
  });

  it('refuses a manual selection that names no sponsorship', async () => {
    const { service } = ready();

    await expect(
      service.upsertSponsorStrip({ ...SPONSOR_STRIP_DEFAULTS, selection: 'manual', sponsorshipIds: [] }),
    ).rejects.toMatchObject({ response: { code: 'missingRequiredField', field: 'sponsorStrip.sponsorshipIds' } });
  });

  it('keeps a manual selection in the order the editor gave it', async () => {
    const { repository, service } = ready();
    const ids = [new Types.ObjectId().toString(), new Types.ObjectId().toString()];

    await service.upsertSponsorStrip({ ...SPONSOR_STRIP_DEFAULTS, selection: 'manual', sponsorshipIds: ids });

    const written = repository.updateById.mock.calls[0][1] as { sponsorStrip: { sponsorshipIds: Types.ObjectId[] } };
    expect(written.sponsorStrip.sponsorshipIds.map(String)).toEqual(ids);
  });

  it('serves the strip on the public settings, with defaults filled and ids as strings', async () => {
    const { repository, service } = ready();
    const id = new Types.ObjectId();
    repository.findOne.mockResolvedValue({
      footerAboutBlurb: null,
      sponsorStrip: { isVisible: false, displayMode: 'logo', selection: 'manual', sponsorshipIds: [id] },
    } as never);

    const result = await service.getPublic();

    expect(result?.sponsorStrip).toEqual({
      isVisible: false,
      displayMode: 'logo',
      selection: 'manual',
      sponsorshipIds: [id.toString()],
      order: 'tier',
      pinnedSponsorshipId: null,
      speed: 'medium',
    });
  });
});
