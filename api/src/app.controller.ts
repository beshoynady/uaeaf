import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator.js';

/** Root-level health check, used by uptime monitoring and e2e smoke tests. */
@Controller()
export class AppController {
  @Public()
  @Get('health')
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
