import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { assertSponsorsSectionSettings } from './sponsors-settings.js';
import { PageSectionsService } from './page-sections.service.js';
import { PageSectionsRepository } from './page-sections.repository.js';
import { PAGE_SECTION_TYPES } from './schemas/page-sections.schema.js';

/**
 * The SPONSORS section's own settings (ADR-0077 D2, ADR-0085 D5): which
 * sponsorship the banner prefers among those of the highest tier present, and
 * the partnership call to action, shown only when it goes somewhere.
 */
describe('SPONSORS section settings', () => {
  const section = (overrides: Record<string, unknown> = {}) => ({
    sectionType: 'SPONSORS',
    configuration: null,
    ctaText: null,
    ctaUrl: null,
    ...overrides,
  });

  it('accepts no configuration, and a banner preference that is an id or null', () => {
    expect(() => assertSponsorsSectionSettings(section())).not.toThrow();
    expect(() =>
      assertSponsorsSectionSettings(section({ configuration: { bannerSponsorshipId: new Types.ObjectId().toString() } })),
    ).not.toThrow();
    expect(() => assertSponsorsSectionSettings(section({ configuration: { bannerSponsorshipId: null } }))).not.toThrow();
  });

  it('refuses a banner preference that is not an id', () => {
    expect(() => assertSponsorsSectionSettings(section({ configuration: { bannerSponsorshipId: 'ups' } }))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ field: 'configuration.bannerSponsorshipId' }) }),
    );
  });

  it('refuses a call to action with only one half written', () => {
    expect(() => assertSponsorsSectionSettings(section({ ctaUrl: '/contact' }))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'incompleteCta' }) }),
    );
    expect(() => assertSponsorsSectionSettings(section({ ctaText: { ar: 'انضم', en: 'Join' } }))).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code: 'incompleteCta' }) }),
    );
  });

  it('refuses a call to action that points somewhere the site does not allow', () => {
    expect(() =>
      assertSponsorsSectionSettings(section({ ctaText: { ar: 'انضم', en: 'Join' }, ctaUrl: 'javascript:alert(1)' })),
    ).toThrow(expect.objectContaining({ response: expect.objectContaining({ code: 'invalidCtaUrl' }) }));
    expect(() =>
      assertSponsorsSectionSettings(section({ ctaText: { ar: 'انضم', en: 'Join' }, ctaUrl: '/contact' })),
    ).not.toThrow();
  });

  it('has a MEMBERSHIPS section type, next to PARTNERS and SPONSORS', () => {
    expect(PAGE_SECTION_TYPES).toEqual(expect.arrayContaining(['SPONSORS', 'PARTNERS', 'MEMBERSHIPS']));
  });

  describe('through PageSectionsService', () => {
    const makeRepository = () =>
      ({
        create: jest.fn(async (data: unknown) => data),
        findById: jest.fn(),
        updateById: jest.fn(async (_id: string, data: unknown) => data),
      }) as unknown as jest.Mocked<PageSectionsRepository>;

    const base = () => ({
      pageId: new Types.ObjectId().toString(),
      sectionType: 'SPONSORS' as const,
      displayOrder: 2,
      visibility: 'Everyone' as const,
      selectionMode: 'AUTOMATIC' as const,
    });

    it('checks the settings on create', async () => {
      const service = new PageSectionsService(makeRepository());
      await expect(service.create({ ...base(), ctaUrl: '/contact' })).rejects.toMatchObject({
        response: { code: 'incompleteCta' },
      });
    });

    it('checks the settings on the section an update produces', async () => {
      const repository = makeRepository();
      repository.findById.mockResolvedValue({
        sectionType: 'SPONSORS',
        ctaText: { ar: 'انضم', en: 'Join' },
        ctaUrl: '/contact',
        configuration: null,
      } as never);
      const service = new PageSectionsService(repository);

      await expect(service.update('any', { ctaUrl: null })).rejects.toMatchObject({ response: { code: 'incompleteCta' } });
    });
  });
});
