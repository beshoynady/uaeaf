import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { JwtStrategy } from './jwt.strategy.js';
import { RolesService } from '../../roles/roles.service.js';
import type { JwtPayload } from '../../../../common/interfaces/jwt-payload.interface.js';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let rolesService: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn(() => 'test-secret') },
        },
        {
          provide: RolesService,
          useValue: { resolvePermissions: jest.fn() },
        },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
    rolesService = module.get(RolesService);
  });

  const accessPayload = (roleIds: string[]): JwtPayload => ({
    sub: new Types.ObjectId().toString(),
    type: 'access',
    roleIds,
  });

  it('resolves the caller permissions from the database, not from the token', async () => {
    const roleId = new Types.ObjectId().toString();
    rolesService.resolvePermissions.mockResolvedValue([{ resourceType: 'users', action: 'Read' }]);

    const user = await strategy.validate(accessPayload([roleId]));

    expect(rolesService.resolvePermissions).toHaveBeenCalledWith([roleId]);
    expect(user.permissions).toEqual([{ resourceType: 'users', action: 'Read' }]);
    expect(user.roleIds).toEqual([roleId]);
  });

  it('rejects a refresh token presented as an access token', async () => {
    // Same secret signs both, so the `type` claim is the only thing
    // separating them (auth-security-audit-2026-09-05.md P1).
    await expect(
      strategy.validate({ sub: 'u1', type: 'refresh' } as unknown as JwtPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rolesService.resolvePermissions).not.toHaveBeenCalled();
  });

  it('rejects a pre-migration token that carries permissions instead of roleIds', async () => {
    // The old shape (BE-PLAN-010 §4.4, superseded 2026-09-07) embedded a
    // flattened permission set. Honouring it would reintroduce exactly the
    // staleness the roleIds-only decision removes, so it is refused
    // outright: the 401 sends the BFF to /auth/refresh, which mints the new
    // shape from the still-valid refresh token. No dual-shape window.
    const legacy = {
      sub: new Types.ObjectId().toString(),
      type: 'access',
      permissions: [{ resourceType: 'users', action: 'Read' }],
    } as unknown as JwtPayload;

    await expect(strategy.validate(legacy)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(rolesService.resolvePermissions).not.toHaveBeenCalled();
  });

  it('rejects an access token whose roleIds claim is not an array', async () => {
    await expect(
      strategy.validate({ sub: 'u1', type: 'access', roleIds: 'not-an-array' } as unknown as JwtPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a user with no roles at all, granting them nothing', async () => {
    // A valid identity with zero authority — every guarded route refuses
    // them, but /users/me and logout still work.
    rolesService.resolvePermissions.mockResolvedValue([]);

    const user = await strategy.validate(accessPayload([]));

    expect(user.permissions).toEqual([]);
  });
});
