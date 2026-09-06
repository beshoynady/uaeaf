import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload, AuthenticatedUser } from '../../../../common/interfaces/jwt-payload.interface.js';

/** Verifies the access token's signature/expiry (passport-jwt handles both
 *  before `validate` runs) and maps its payload onto `request.user`. Does
 *  NOT re-query the database — the permission set is read entirely from the
 *  token, per BE-PLAN-010 §4.4. */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Required by validation.schema.ts — never undefined once booted.
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  /** @throws UnauthorizedException for anything but an access token — a
   *  refresh token (no `permissions`, `type: 'refresh'`) has a valid
   *  signature too, so without this explicit check it would otherwise pass
   *  straight through as an authenticated request (auth-security-audit-
   *  2026-09-05.md P1: full access on routes with no @RequirePermission(),
   *  an unhandled crash on routes that have one). */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }
    return { userId: payload.sub, permissions: payload.permissions };
  }
}
