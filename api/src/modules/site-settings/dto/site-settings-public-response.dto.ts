import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { DefaultSeoDto } from './upsert-site-settings.dto.js';

/** Public-safe `SiteSettings` shape. Structurally omits every
 *  `[RESTRICTED]` field — `isMaintenanceMode`, `googleAnalyticsId`,
 *  `metaPixelId`, `sessionTimeoutMinutes`, `maxLoginAttempts`,
 *  `systemEmailSender` — as a distinct class rather than a conditionally
 *  serialised subset, the same discipline used for
 *  `AthleteProfile.restricted` in Week 3. */
export class SiteSettingsPublicResponseDto {
  @ApiProperty({ type: DefaultSeoDto, required: false, nullable: true })
  defaultSeo: DefaultSeoDto | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  footerAboutBlurb: LocalizedTextDto | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  copyrightText: LocalizedTextDto | null;
  @ApiProperty({ required: false, nullable: true }) logoId: string | null;
  @ApiProperty({ required: false, nullable: true }) logoDarkId: string | null;
  @ApiProperty({ required: false, nullable: true }) faviconId: string | null;
  @ApiProperty({ required: false, nullable: true }) privacyPolicyPageId: string | null;
  @ApiProperty({ required: false, nullable: true }) termsOfUsePageId: string | null;
  @ApiProperty({ required: false, nullable: true }) accessibilityStatementPageId: string | null;
  @ApiProperty() cookieConsentEnabled: boolean;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  cookieConsentText: LocalizedTextDto | null;
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  maintenanceMessage: LocalizedTextDto | null;
}
