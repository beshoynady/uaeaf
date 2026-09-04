import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }
}
