import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RateLimit } from '../../../common/decorators/rate-limit.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import { extractRequestContext } from '../../../common/utils/request-context.util.js';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshDto } from './dto/refresh.dto.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** Rate-limited independently of the account-level lockout
   *  (`LOCKOUT_THRESHOLD`/`LOCKOUT_DURATION_MINUTES`, `config/auth.config.ts`):
   *  the lockout protects one account from repeated guessing, this protects
   *  the endpoint itself from distributed username-enumeration/credential-
   *  stuffing traffic across many accounts (schema-audit-2026-09-04.md
   *  §3.7/§6.7, P1 finding). */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  @RateLimit(10, 60)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, extractRequestContext(req));
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refreshToken, extractRequestContext(req));
  }

  /** Authenticated (JwtAuthGuard, no @Public()) — the caller must present a
   *  currently-valid access token, and the refresh token in the body must
   *  belong to that same identity (enforced in AuthService.logout()). Closes
   *  auth-security-audit-2026-09-05.md P0 #4: previously there was no way
   *  to invalidate a refresh token before its natural 7-day expiry at all. */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(@Body() dto: RefreshDto, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logout(dto.refreshToken, user.userId);
  }

  /** Revokes every session for the caller, not just the current one — the
   *  "I think one of my devices/tokens is compromised" response. */
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout-all')
  async logoutAll(@CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.authService.logoutAll(user.userId);
  }
}
