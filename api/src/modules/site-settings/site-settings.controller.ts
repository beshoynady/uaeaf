import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/permissions.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { SiteSettingsService } from './site-settings.service.js';
import { UpsertSiteSettingsDto } from './dto/upsert-site-settings.dto.js';

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

  @Put()
  @RequirePermission('siteSettings', 'Update')
  upsert(@Body() dto: UpsertSiteSettingsDto) {
    return this.service.upsert(dto);
  }
}
