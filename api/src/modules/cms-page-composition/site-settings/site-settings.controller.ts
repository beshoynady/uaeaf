import { Body, Controller, Get, Put, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../../common/decorators/permissions.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { SiteSettingsService } from './site-settings.service.js';
import { UpsertSiteSettingsDto } from './dto/upsert-site-settings.dto.js';
import { SponsorStripSettingsDto } from './dto/sponsor-strip.dto.js';
import { FooterSettingsDto } from './dto/footer-settings.dto.js';
import { RefuseFieldsWrittenElsewhereInterceptor } from './refuse-fields-written-elsewhere.interceptor.js';

/** Implements: siteSettings collection, Domain 11 — CMS & Page Composition.
 *  Singleton. The public route serves the `[RESTRICTED]`-free projection;
 *  the RBAC-gated route serves the full row. */
@ApiTags('site-settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly service: SiteSettingsService) {}

  /** Public-safe projection — never exposes analytics ids, the maintenance
   *  flag, session/lockout settings or the system sender address. */
  @Get('public')
  @Public()
  getPublic() {
    return this.service.getPublic();
  }

  @Get()
  @RequirePermission('siteSettings', 'Read')
  get() {
    return this.service.get();
  }

  /** The settings no screen of their own writes. A field the footer or strip
   *  route owns is refused here by name (ADR-0093), never applied. */
  @Put()
  @RequirePermission('siteSettings', 'Update')
  @UseInterceptors(RefuseFieldsWrittenElsewhereInterceptor)
  upsert(@Body() dto: UpsertSiteSettingsDto) {
    return this.service.upsert(dto);
  }

  /** The global sponsor strip's settings alone (ADR-0077 D5). Same permission
   *  as the rest of the site settings: the strip is site-wide chrome. */
  @Put('sponsor-strip')
  @RequirePermission('siteSettings', 'Update')
  upsertSponsorStrip(@Body() dto: SponsorStripSettingsDto) {
    return this.service.upsertSponsorStrip(dto);
  }

  /** The footer's own words alone (ADR-0092). Same permission as the strip:
   *  the footer is site-wide chrome. */
  @Put('footer')
  @RequirePermission('siteSettings', 'Update')
  upsertFooter(@Body() dto: FooterSettingsDto) {
    return this.service.upsertFooter(dto);
  }
}
