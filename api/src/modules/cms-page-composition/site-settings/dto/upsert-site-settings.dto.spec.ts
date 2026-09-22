import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpsertSiteSettingsDto } from './upsert-site-settings.dto.js';
import { FIELDS_WRITTEN_ELSEWHERE } from '../refuse-fields-written-elsewhere.interceptor.js';

/**
 * `PUT /site-settings` carries only the settings no screen of their own
 * writes (ADR-0093). A field that has its own screen and route belongs to it
 * alone: the footer's words to `PUT /site-settings/footer`, the sponsor strip
 * to `PUT /site-settings/sponsor-strip`. Checked through the same pipeline the
 * global `ValidationPipe` runs.
 */
const errorsOf = async (body: Record<string, unknown>) =>
  validate(plainToInstance(UpsertSiteSettingsDto, body), { whitelist: true, forbidNonWhitelisted: true });

const pair = { en: 'Text', ar: 'نص' };

describe('UpsertSiteSettingsDto', () => {
  it.each(Object.keys(FIELDS_WRITTEN_ELSEWHERE))('has no %s: its own screen writes it', async (field) => {
    expect(await errorsOf({ [field]: pair })).not.toHaveLength(0);
  });

  it('still takes every setting that has no screen of its own', async () => {
    expect(
      await errorsOf({
        defaultSeo: { titleSuffix: pair, defaultDescription: pair },
        privacyPolicyPageId: '6aa04ba9e3d1ab8b4179f100',
        cookieConsentEnabled: true,
        cookieConsentText: pair,
        isMaintenanceMode: true,
        maintenanceMessage: pair,
        googleAnalyticsId: 'G-TEST',
        metaPixelId: 'PIXEL',
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
        systemEmailSender: 'noreply@uaeaf.ae',
      }),
    ).toHaveLength(0);
  });
});
