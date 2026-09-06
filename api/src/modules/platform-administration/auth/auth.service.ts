import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service.js';
import { RolesService } from '../roles/roles.service.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import type { JwtPayload, RefreshTokenPayload } from '../../../common/interfaces/jwt-payload.interface.js';
import type { RequiredPermission } from '../../../common/decorators/permissions.decorator.js';
import { hashToken } from '../../../common/utils/hash-token.util.js';
import { LoginDto } from './dto/login.dto.js';
import type { TokenResponse } from './interfaces/token-response.interface.js';

/** ip/userAgent for the AuthSession row created by every login/refresh
 *  (auth-security-audit-2026-09-05.md P0 #4) — same shape `extractRequestContext()`
 *  already produces for audit logging, reused here rather than re-declared. */
interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

/**
 * Implements the login/refresh flow described in BE-PLAN-010 §4.3–§4.4:
 * the access token embeds a flattened permission set resolved at
 * login/refresh time; PermissionsGuard reads that embedded set and never
 * queries users/roles/permissions per request.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly permissionsService: PermissionsService,
    private readonly authSessionsService: AuthSessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @throws UnauthorizedException for an unknown email, wrong password, or
   *  a non-Active account — the same generic message in every case, so a
   *  caller cannot use the error to enumerate which emails are registered.
   *  A locked account (brute-force lockout, addendum confirmed 2026-09-02)
   *  gets its own, deliberately distinct message — that one case is allowed
   *  to leak "this account is locked" by design.
   */
  async login(dto: LoginDto, context: RequestContext): Promise<TokenResponse> {
    const user = await this.usersService.findByEmail(dto.email);
    const localAuth = user?.authMethods.find((method) => method.provider === 'Local');

    if (!user || !localAuth?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    // Checked before the password comparison and before touching
    // failedLoginAttempts at all: an attempt made during an active lockout
    // must not extend it, or a locked account could be kept locked
    // indefinitely by repeated hammering.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account temporarily locked after repeated failed login attempts. Try again later.',
      );
    }

    if (user.accountStatus !== 'Active') {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await bcrypt.compare(dto.password, localAuth.passwordHash);
    if (!passwordMatches) {
      await this.usersService.recordFailedLogin(user._id.toString(), user.failedLoginAttempts);
      throw new UnauthorizedException('Invalid credentials.');
    }

    const userId = user._id.toString();
    const permissions = await this.resolvePermissions(user.roleIds);
    await this.usersService.recordSuccessfulLogin(userId);
    const tokens = await this.issueTokens(userId, permissions, context);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  /**
   * Re-resolves roleIds/permissionIds/accountStatus at mint time (BE-PLAN-010
   * §4.3) — the refresh token itself carries no permissions. Also now
   * checks the token's `authSessions` row (auth-security-audit-2026-09-05.md
   * P0 #4): a revoked session, or a session already rotated into a newer
   * one, means this exact refresh token is dead even though its JWT
   * signature/expiry are still technically valid — the row is the actual
   * source of truth for whether a refresh token is still usable, not just
   * the signature.
   * @throws UnauthorizedException for an invalid/expired/revoked/reused
   *  refresh token, or a now-non-Active account.
   */
  async refresh(refreshToken: string, context: RequestContext): Promise<TokenResponse> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.getSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    // Rejects an access token presented here just as strictly as
    // JwtStrategy rejects a refresh token presented as an access token
    // (auth-security-audit-2026-09-05.md P1) — both directions of the
    // access/refresh confusion are closed by the same `type` claim.
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const session = await this.authSessionsService.findById(payload.sessionId);
    if (!session || session.revokedAt || session.replacedBySessionId) {
      // Missing, already revoked, or already rotated away — the last case
      // is reuse of a token that was already exchanged for a newer one,
      // a real reuse-detection signal (not just "expired"). If the row is
      // still live, burn it now so this exact attempt can't succeed again
      // either, even if the underlying account turns out to be fine.
      if (session && !session.revokedAt) {
        await this.authSessionsService.revoke(session._id);
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }

    if (hashToken(refreshToken) !== session.refreshTokenHash) {
      // Defensive: the sessionId resolved to a real, still-active row, but
      // the presented token doesn't match what was actually issued for it.
      // Shouldn't happen via the normal flow — fail closed and revoke
      // rather than trust a token that doesn't match its own session.
      await this.authSessionsService.revoke(session._id);
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.accountStatus !== 'Active') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const permissions = await this.resolvePermissions(user.roleIds);
    const tokens = await this.issueTokens(payload.sub, permissions, context);
    // Rotation: the presented token is now permanently spent — any future
    // attempt to use it again hits the replacedBySessionId check above.
    await this.authSessionsService.markReplaced(session._id, tokens.sessionId);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
  }

  /** @throws UnauthorizedException for an invalid refresh token, or one that
   *  doesn't belong to the caller (`payload.sub` must match the access
   *  token's own identity) — stops one authenticated user from logging out
   *  a session that isn't theirs just because they hold that refresh token.
   *  Idempotent: revoking an already-revoked session is a harmless no-op. */
  async logout(refreshToken: string, actorUserId: string): Promise<void> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: this.getSecret() });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    if (payload.type !== 'refresh' || payload.sub !== actorUserId) {
      throw new UnauthorizedException('Invalid refresh token.');
    }
    await this.authSessionsService.revoke(payload.sessionId);
  }

  /** Revokes every outstanding refresh token for this user — every other
   *  device/session stops working on its next refresh attempt, regardless
   *  of which one issued it (auth-security-audit-2026-09-05.md P0 #4). */
  async logoutAll(userId: string): Promise<void> {
    await this.authSessionsService.revokeAllForUser(userId);
  }

  private async resolvePermissions(roleIds: Types.ObjectId[]): Promise<RequiredPermission[]> {
    const roles = await Promise.all(roleIds.map((id) => this.rolesService.findById(id.toString())));
    const permissionIds = new Set(
      roles.flatMap((role) => role?.permissionIds.map((id) => id.toString()) ?? []),
    );
    const permissions = await Promise.all(
      [...permissionIds].map((id) => this.permissionsService.findById(id)),
    );
    return permissions
      .filter((permission): permission is NonNullable<typeof permission> => permission !== null)
      .map((permission) => ({ resourceType: permission.resourceType, action: permission.action }));
  }

  /** Also creates the `authSessions` row the refresh token belongs to
   *  (auth-security-audit-2026-09-05.md P0 #4) — `sessionId` is returned so
   *  refresh() can link the old session's `replacedBySessionId` to it on
   *  rotation; login()/refresh() strip it before returning TokenResponse to
   *  the client, it's never part of the public API surface. */
  private async issueTokens(
    userId: string,
    permissions: RequiredPermission[],
    context: RequestContext,
  ): Promise<TokenResponse & { sessionId: Types.ObjectId }> {
    const secret = this.getSecret();
    // Generated up front so the refresh JWT can embed it as `sessionId`
    // before the AuthSession row itself is written.
    const sessionId = new Types.ObjectId();

    // `type` distinguishes access from refresh (auth-security-audit-
    // 2026-09-05.md P1) — same secret signs both, so without this claim a
    // refresh token could pass JwtStrategy as a valid access token.
    const payload: JwtPayload = { sub: userId, type: 'access', permissions };
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      type: 'refresh',
      sessionId: sessionId.toString(),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get<StringValue>('jwt.accessExpiry'),
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret,
      expiresIn: this.configService.get<StringValue>('jwt.refreshExpiry'),
    });

    // Reads `exp` off the token that was actually just signed rather than
    // re-parsing the "7d"-style config string a second time — guarantees
    // the stored expiresAt always matches what the JWT itself will honor.
    const decoded = this.jwtService.decode(refreshToken) as { exp: number };

    await this.authSessionsService.create({
      sessionId,
      userId: new Types.ObjectId(userId),
      refreshTokenHash: hashToken(refreshToken),
      expiresAt: new Date(decoded.exp * 1000),
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { accessToken, refreshToken, sessionId };
  }

  /** `jwt.secret` is required by validation.schema.ts — the app never
   *  finishes booting without it, so this narrows away the `| undefined`
   *  ConfigService.get() otherwise carries. */
  private getSecret(): string {
    return this.configService.get<string>('jwt.secret')!;
  }
}
