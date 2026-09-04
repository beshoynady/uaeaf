import { Injectable } from '@nestjs/common';
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

  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, permissions: payload.permissions };
  }
}
