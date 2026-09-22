import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { SiteSettingsService } from './site-settings.service.js';
import { SiteSettingsRepository } from './site-settings.repository.js';

/**
 * The footer's own words (ADR-0092): the description under the federation's
 * name, the copyright line, and the three column headings. Everything else the
 * footer shows has another source — the contact page's record, or the site's
 * navigation — so it is not stored here.
 *
 * Written through their own route, as the sponsor strip is: saving the footer
 * never resets the strip or the SEO defaults, and the general settings save,
 * which does not name the headings, never resets them.
 */
describe('footer settings', () => {
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

  const blurb = { ar: 'الجهة الرسمية المشرفة على ألعاب القوى.', en: 'The official governing body for athletics.' };
  const copyright = { ar: '© 2026 اتحاد الإمارات لألعاب القوى.', en: '© 2026 UAE Athletics Federation.' };
  const headings = {
    quickLinks: { ar: 'روابط سريعة', en: 'Quick Links' },
    location: { ar: 'الموقع', en: 'Location' },
    contact: { ar: 'التواصل', en: 'Contact' },
  };

  it('writes the footer alone, never the other settings', async () => {
    const { repository, service } = ready();

    await service.upsertFooter({ footerAboutBlurb: blurb, copyrightText: copyright, footerHeadings: headings });

    const written = repository.updateById.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(written).sort()).toEqual(['copyrightText', 'footerAboutBlurb', 'footerHeadings']);
    expect(written).toEqual({ footerAboutBlurb: blurb, copyrightText: copyright, footerHeadings: headings });
  });

  it('writes what the editor cleared as null, because the screen sends the whole footer', async () => {
    const { repository, service } = ready();

    await service.upsertFooter({ footerHeadings: { location: headings.location } });

    expect(repository.updateById.mock.calls[0][1]).toEqual({
      footerAboutBlurb: null,
      copyrightText: null,
      footerHeadings: { quickLinks: null, location: headings.location, contact: null },
    });
  });

  it('creates the settings row when none exists yet', async () => {
    const { repository, service } = ready();
    repository.findOne.mockResolvedValue(null as never);

    await service.upsertFooter({ copyrightText: copyright });

    expect(repository.create).toHaveBeenCalledWith({
      footerAboutBlurb: null,
      copyrightText: copyright,
      footerHeadings: null,
    });
  });

  it('is not reset by the general settings save, which does not name the headings', async () => {
    const { repository, service } = ready();

    await service.upsert({});

    const written = repository.updateById.mock.calls[0][1] as Record<string, unknown>;
    expect(written).not.toHaveProperty('footerHeadings');
  });

  it('serves the headings on the public settings', async () => {
    const { repository, service } = ready();
    repository.findOne.mockResolvedValue({ footerAboutBlurb: blurb, footerHeadings: headings } as never);

    const result = await service.getPublic();

    expect(result?.footerAboutBlurb).toEqual(blurb);
    expect(result?.footerHeadings).toEqual(headings);
  });

  it('serves no headings when none were ever saved', async () => {
    const { repository, service } = ready();
    repository.findOne.mockResolvedValue({ footerAboutBlurb: null } as never);

    const result = await service.getPublic();

    expect(result?.footerHeadings).toBeNull();
  });
});
