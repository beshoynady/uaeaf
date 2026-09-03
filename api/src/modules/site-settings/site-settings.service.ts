import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { SingletonPageService } from '../../common/services/singleton-page.service.js';
import { MediaAssetsService } from '../media-assets/media-assets.service.js';
import { SiteSettingsRepository } from './site-settings.repository.js';
import type { SiteSettingsDocument } from './schemas/site-settings.schema.js';
import { UpsertSiteSettingsDto } from './dto/upsert-site-settings.dto.js';
import { SiteSettingsPublicResponseDto } from './dto/site-settings-public-response.dto.js';

/** Implements: siteSettings collection, Domain 11 — CMS & Page Composition.
 *  Singleton (decision #8) — see `SingletonPageService`.
 *
 *  `getPublic()` is the only shape an unauthenticated reader may see: it
 *  drops every `[RESTRICTED]` field (analytics ids, maintenance flag,
 *  session/lockout settings, system sender address). */
@Injectable()
export class SiteSettingsService extends SingletonPageService<SiteSettingsDocument> {
  constructor(
    repository: SiteSettingsRepository,
    private readonly mediaAssetsService: MediaAssetsService,
  ) {
    super(repository);
  }

  async upsert(dto: UpsertSiteSettingsDto): Promise<SiteSettingsDocument> {
    for (const imageId of [dto.logoId, dto.logoDarkId, dto.faviconId, dto.defaultSeo?.defaultOgImageId]) {
      if (imageId) {
        await this.mediaAssetsService.assertUsableImage(imageId);
      }
    }

    return this.upsertDocument({
      defaultSeo: dto.defaultSeo
        ? {
            titleSuffix: dto.defaultSeo.titleSuffix ?? null,
            defaultOgImageId: dto.defaultSeo.defaultOgImageId
              ? new Types.ObjectId(dto.defaultSeo.defaultOgImageId)
              : null,
            defaultDescription: dto.defaultSeo.defaultDescription ?? null,
          }
        : null,
      footerAboutBlurb: dto.footerAboutBlurb ?? null,
      copyrightText: dto.copyrightText ?? null,
      logoId: dto.logoId ? new Types.ObjectId(dto.logoId) : null,
      logoDarkId: dto.logoDarkId ? new Types.ObjectId(dto.logoDarkId) : null,
      faviconId: dto.faviconId ? new Types.ObjectId(dto.faviconId) : null,
      privacyPolicyPageId: dto.privacyPolicyPageId ? new Types.ObjectId(dto.privacyPolicyPageId) : null,
      termsOfUsePageId: dto.termsOfUsePageId ? new Types.ObjectId(dto.termsOfUsePageId) : null,
      accessibilityStatementPageId: dto.accessibilityStatementPageId
        ? new Types.ObjectId(dto.accessibilityStatementPageId)
        : null,
      cookieConsentEnabled: dto.cookieConsentEnabled ?? false,
      cookieConsentText: dto.cookieConsentText ?? null,
      isMaintenanceMode: dto.isMaintenanceMode ?? false,
      maintenanceMessage: dto.maintenanceMessage ?? null,
      googleAnalyticsId: dto.googleAnalyticsId ?? null,
      metaPixelId: dto.metaPixelId ?? null,
      sessionTimeoutMinutes: dto.sessionTimeoutMinutes ?? null,
      maxLoginAttempts: dto.maxLoginAttempts ?? null,
      systemEmailSender: dto.systemEmailSender ?? null,
    });
  }

  /** Public-safe view — `null` before settings are first saved. */
  async getPublic(): Promise<SiteSettingsPublicResponseDto | null> {
    const settings = await this.get();
    if (!settings) {
      return null;
    }
    return {
      defaultSeo: settings.defaultSeo
        ? {
            titleSuffix: settings.defaultSeo.titleSuffix ?? undefined,
            defaultOgImageId: settings.defaultSeo.defaultOgImageId
              ? settings.defaultSeo.defaultOgImageId.toString()
              : undefined,
            defaultDescription: settings.defaultSeo.defaultDescription ?? undefined,
          }
        : null,
      footerAboutBlurb: settings.footerAboutBlurb,
      copyrightText: settings.copyrightText,
      logoId: settings.logoId ? settings.logoId.toString() : null,
      logoDarkId: settings.logoDarkId ? settings.logoDarkId.toString() : null,
      faviconId: settings.faviconId ? settings.faviconId.toString() : null,
      privacyPolicyPageId: settings.privacyPolicyPageId ? settings.privacyPolicyPageId.toString() : null,
      termsOfUsePageId: settings.termsOfUsePageId ? settings.termsOfUsePageId.toString() : null,
      accessibilityStatementPageId: settings.accessibilityStatementPageId
        ? settings.accessibilityStatementPageId.toString()
        : null,
      cookieConsentEnabled: settings.cookieConsentEnabled,
      cookieConsentText: settings.cookieConsentText,
      maintenanceMessage: settings.maintenanceMessage,
    };
  }
}
