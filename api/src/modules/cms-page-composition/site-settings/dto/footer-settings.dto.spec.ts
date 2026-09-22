import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FooterSettingsDto } from './footer-settings.dto.js';

/**
 * The body of `PUT /site-settings/footer` (ADR-0092), checked through the same
 * pipeline the global `ValidationPipe` runs, with `forbidNonWhitelisted`.
 */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(FooterSettingsDto, body), { whitelist: true, forbidNonWhitelisted: true });

const pair = { ar: 'الموقع', en: 'Location' };

describe('FooterSettingsDto', () => {
  it('accepts the whole footer', async () => {
    expect(
      await errorsOf({
        footerAboutBlurb: pair,
        copyrightText: pair,
        footerHeadings: { quickLinks: pair, location: pair, contact: pair },
      }),
    ).toHaveLength(0);
  });

  it('accepts a footer with nothing of its own, which the site reads as its built-in text', async () => {
    expect(await errorsOf({})).toHaveLength(0);
    expect(await errorsOf({ footerAboutBlurb: null, copyrightText: null, footerHeadings: null })).toHaveLength(0);
  });

  it('refuses a text in one language only, which would render blank in the other', async () => {
    expect(await errorsOf({ copyrightText: { ar: '© الاتحاد', en: '' } })).not.toHaveLength(0);
    expect(await errorsOf({ footerHeadings: { location: { ar: 'الموقع' } } })).not.toHaveLength(0);
  });

  it('refuses a heading for a column the footer does not have', async () => {
    expect(await errorsOf({ footerHeadings: { newsletter: pair } })).not.toHaveLength(0);
  });

  it('refuses a field that belongs to another settings screen', async () => {
    expect(await errorsOf({ isMaintenanceMode: true })).not.toHaveLength(0);
  });
});
