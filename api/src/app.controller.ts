import { Controller, Get, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';

/** Root-level health check, used by uptime monitoring and e2e smoke tests.
 *  Deliberately kept outside the /api/v1 surface (VERSION_NEUTRAL here,
 *  plus a matching exclude in main.ts's setGlobalPrefix): infra tooling
 *  that probes this shouldn't need to track API version bumps. */
@Controller()
export class AppController {
  @Public()
  @Version(VERSION_NEUTRAL)
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
