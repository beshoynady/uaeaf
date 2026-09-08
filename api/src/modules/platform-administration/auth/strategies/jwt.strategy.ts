import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RolesService } from '../../roles/roles.service.js';
import type { JwtPayload, AuthenticatedUser } from '../../../../common/interfaces/jwt-payload.interface.js';

/**
 * Verifies the access token's signature/expiry (passport-jwt handles both
 * before `validate` runs), then resolves the caller's authority from the
 * database.
 *
 * The database read is the point (owner decision 2026-09-07, superseding
 * BE-PLAN-010 §4.4). The token names the caller's roles; what those roles
 * currently permit is looked up here, on every request, so an edit to a role
 * reaches its holders immediately rather than at the end of a 15-minute
 * token life. It costs two indexed reads — see
 * RolesService.resolvePermissions.
 *
 * Doing it here rather than in PermissionsGuard is deliberate: this is where
 * `request.user` is built, so `permissions` is populated for every
 * authenticated route, including the ones with no @RequirePermission (GET
 * /users/me, logout). Had the guard resolved it, those routes would have
 * received an empty array that reads as "holds nothing" — a lie that
 * anything later consuming @CurrentUser() would have believed.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly rolesService: RolesService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Required by validation.schema.ts — never undefined once booted.
      secretOrKey: configService.get<string>('jwt.secret')!,
    });
  }

  /**
   * @throws UnauthorizedException for anything but an access token — a
   *  refresh token (`type: 'refresh'`) has a valid signature too, so without
   *  this explicit check it would otherwise pass straight through as an
   *  authenticated request (auth-security-audit-2026-09-05.md P1).
   * @throws UnauthorizedException for a token with no `roleIds` array. That
   *  is the pre-2026-09-07 shape, which carried `permissions` instead.
   *  Honouring it would reinstate exactly the staleness the roleIds-only
   *  decision removes, so it is refused rather than accepted for a
   *  transitional window: the 401 sends the caller to /auth/refresh, whose
   *  still-valid refresh token mints the new shape. Migration is one failed
   *  request per session, and needs no dual-shape code path.
   */
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid access token.');
    }
    if (!Array.isArray(payload.roleIds)) {
      throw new UnauthorizedException('Invalid access token.');
    }

    const permissions = await this.rolesService.resolvePermissions(payload.roleIds);
    return { userId: payload.sub, roleIds: payload.roleIds, permissions };
  }
}
