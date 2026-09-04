import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import type { StringValue } from 'ms';
import { UsersService } from '../users/users.service.js';
import { RolesService } from '../roles/roles.service.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import type { JwtPayload } from '../../../common/interfaces/jwt-payload.interface.js';
import type { RequiredPermission } from '../../../common/decorators/permissions.decorator.js';
import { LoginDto } from './dto/login.dto.js';
import type { TokenResponse } from './interfaces/token-response.interface.js';

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
  async login(dto: LoginDto): Promise<TokenResponse> {
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
    return this.issueTokens(userId, permissions);
  }

  /**
   * Re-resolves roleIds/permissionIds/accountStatus at mint time (BE-PLAN-010
   * §4.3) — the refresh token itself carries no permissions.
   * @throws UnauthorizedException for an invalid refresh token or a
   *  now-non-Active account.
   */
  async refresh(refreshToken: string): Promise<TokenResponse> {
    let payload: { sub: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.getSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user || user.accountStatus !== 'Active') {
      throw new UnauthorizedException('Invalid refresh token.');
    }

    const permissions = await this.resolvePermissions(user.roleIds);
    return this.issueTokens(payload.sub, permissions);
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

  private issueTokens(userId: string, permissions: RequiredPermission[]): TokenResponse {
    const secret = this.getSecret();
    const payload: JwtPayload = { sub: userId, permissions };

    const accessToken = this.jwtService.sign(payload, {
      secret,
      expiresIn: this.configService.get<StringValue>('jwt.accessExpiry'),
    });
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret, expiresIn: this.configService.get<StringValue>('jwt.refreshExpiry') },
    );

    return { accessToken, refreshToken };
  }

  /** `jwt.secret` is required by validation.schema.ts — the app never
   *  finishes booting without it, so this narrows away the `| undefined`
   *  ConfigService.get() otherwise carries. */
  private getSecret(): string {
    return this.configService.get<string>('jwt.secret')!;
  }
}
