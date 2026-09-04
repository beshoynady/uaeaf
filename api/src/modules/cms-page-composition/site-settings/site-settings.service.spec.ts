import { jest } from '@jest/globals';
import { Types } from 'mongoose';
import { SiteSettingsService } from './site-settings.service.js';
import { SiteSettingsRepository } from './site-settings.repository.js';
import { MediaAssetsService } from '../../media-center/media-assets/media-assets.service.js';

describe('SiteSettingsService', () => {
  const makeRepository = () =>
    ({ findOne: jest.fn(), create: jest.fn(), updateById: jest.fn() }) as unknown as jest.Mocked<SiteSettingsRepository>;
  const makeMediaAssets = () =>
    ({ assertUsableImage: jest.fn() }) as unknown as jest.Mocked<MediaAssetsService>;

  describe('getPublic', () => {
    it('omits every [RESTRICTED] field from the public projection', async () => {
      const repository = makeRepository();
      repository.findOne.mockResolvedValue({
        defaultSeo: null,
        footerAboutBlurb: { en: 'About', ar: 'عن' },
        copyrightText: { en: '©', ar: '©' },
        logoId: new Types.ObjectId(),
        logoDarkId: null,
        faviconId: null,
        privacyPolicyPageId: null,
        termsOfUsePageId: null,
        accessibilityStatementPageId: null,
        cookieConsentEnabled: true,
        cookieConsentText: null,
        maintenanceMessage: null,
        // [RESTRICTED] — must not surface:
        isMaintenanceMode: true,
        googleAnalyticsId: 'GA-SECRET',
        metaPixelId: 'PIXEL-SECRET',
        sessionTimeoutMinutes: 30,
        maxLoginAttempts: 5,
        systemEmailSender: 'noreply@internal.uaeaf.ae',
      } as never);
      const service = new SiteSettingsService(repository, makeMediaAssets());

      const result = await service.getPublic();

      expect(result).not.toBeNull();
      for (const restricted of [
        'isMaintenanceMode',
        'googleAnalyticsId',
        'metaPixelId',
        'sessionTimeoutMinutes',
        'maxLoginAttempts',
        'systemEmailSender',
      ]) {
        expect(result).not.toHaveProperty(restricted);
      }
      expect(JSON.stringify(result)).not.toContain('SECRET');
      expect(result?.footerAboutBlurb?.en).toBe('About');
      expect(result?.cookieConsentEnabled).toBe(true);
    });

    it('returns null before settings have been saved', async () => {
      const repository = makeRepository();
      repository.findOne.mockResolvedValue(null);
      const service = new SiteSettingsService(repository, makeMediaAssets());

      await expect(service.getPublic()).resolves.toBeNull();
    });
  });
});
