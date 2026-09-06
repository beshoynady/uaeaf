import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { AuthService } from './auth.service.js';
import { UsersService } from '../users/users.service.js';
import { RolesService } from '../roles/roles.service.js';
import { PermissionsService } from '../permissions/permissions.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { hashToken } from '../../../common/utils/hash-token.util.js';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let rolesService: jest.Mocked<RolesService>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let authSessionsService: jest.Mocked<AuthSessionsService>;
  let jwtService: jest.Mocked<JwtService>;

  const roleId = new Types.ObjectId();
  const permissionId = new Types.ObjectId();
  const context = { ipAddress: '203.0.113.7', userAgent: 'jest' };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            recordSuccessfulLogin: jest.fn(),
            recordFailedLogin: jest.fn(),
          },
        },
        { provide: RolesService, useValue: { findById: jest.fn() } },
        { provide: PermissionsService, useValue: { findById: jest.fn() } },
        {
          provide: AuthSessionsService,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            revoke: jest.fn(),
            revokeAllForUser: jest.fn(),
            markReplaced: jest.fn(),
          },
        },
        { provide: JwtService, useValue: { sign: jest.fn(), verifyAsync: jest.fn(), decode: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string> = {
                'jwt.secret': 'test-secret-at-least-32-characters-long',
                'jwt.accessExpiry': '15m',
                'jwt.refreshExpiry': '7d',
              };
              return values[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersService = module.get(UsersService);
    rolesService = module.get(RolesService);
    permissionsService = module.get(PermissionsService);
    authSessionsService = module.get(AuthSessionsService);
    jwtService = module.get(JwtService);

    // issueTokens() always calls jwtService.decode(refreshToken) to read
    // `exp` for the AuthSession row — a fixed far-future timestamp is fine
    // for every test here, none of them assert on the exact expiresAt.
    jwtService.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60 } as never);
  });

  async function activeUserWithLocalPassword(password: string) {
    return {
      _id: new Types.ObjectId(),
      email: 'sara@uaeaf.ae',
      accountStatus: 'Active',
      roleIds: [roleId],
      failedLoginAttempts: 0,
      lockedUntil: null as Date | null,
      authMethods: [{ provider: 'Local', passwordHash: await bcrypt.hash(password, 10) }],
    };
  }

  describe('login', () => {
    it('rejects an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@uaeaf.ae', password: 'whatever12345' }, context),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a wrong password and records the failed attempt', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      user.failedLoginAttempts = 2;
      usersService.findByEmail.mockResolvedValue(user as never);

      await expect(
        service.login({ email: 'sara@uaeaf.ae', password: 'wrong-password' }, context),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.recordFailedLogin).toHaveBeenCalledWith(user._id.toString(), 2);
    });

    it('rejects a correct password on a Suspended account', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      user.accountStatus = 'Suspended';
      usersService.findByEmail.mockResolvedValue(user as never);

      await expect(
        service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' }, context),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects login while locked, without checking the password or recording another attempt', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      user.failedLoginAttempts = 5;
      user.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      usersService.findByEmail.mockResolvedValue(user as never);
      const compareSpy = jest.spyOn(bcrypt, 'compare');

      await expect(
        service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' }, context),
      ).rejects.toThrow(UnauthorizedException);

      expect(compareSpy).not.toHaveBeenCalled();
      expect(usersService.recordFailedLogin).not.toHaveBeenCalled();
      compareSpy.mockRestore();
    });

    it('allows login once lockedUntil is in the past', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      user.failedLoginAttempts = 5;
      user.lockedUntil = new Date(Date.now() - 60 * 1000);
      usersService.findByEmail.mockResolvedValue(user as never);
      rolesService.findById.mockResolvedValue({ permissionIds: [] } as never);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' }, context);

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(usersService.recordSuccessfulLogin).toHaveBeenCalledWith(user._id.toString());
    });

    it('issues tokens with the resolved permission set on success, and creates an AuthSession row (auth-security-audit-2026-09-05.md P0 #4)', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      usersService.findByEmail.mockResolvedValue(user as never);
      rolesService.findById.mockResolvedValue({ permissionIds: [permissionId] } as never);
      permissionsService.findById.mockResolvedValue({ resourceType: 'users', action: 'Read' } as never);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' }, context);

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(usersService.recordSuccessfulLogin).toHaveBeenCalledWith(user._id.toString());
      const [accessPayload, accessOptions] = jwtService.sign.mock.calls[0] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(accessPayload).toEqual({
        sub: user._id.toString(),
        type: 'access',
        permissions: [{ resourceType: 'users', action: 'Read' }],
      });
      expect(accessOptions).toMatchObject({ expiresIn: '15m' });
      const [refreshPayload, refreshOptions] = jwtService.sign.mock.calls[1] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(refreshPayload).toMatchObject({ sub: user._id.toString(), type: 'refresh' });
      expect(typeof refreshPayload.sessionId).toBe('string');
      expect(refreshOptions).toMatchObject({ expiresIn: '7d' });

      // The session row is created with the hash of the signed refresh
      // token, not the raw token itself.
      expect(authSessionsService.create).toHaveBeenCalledTimes(1);
      const [createArgs] = authSessionsService.create.mock.calls[0] as [Record<string, unknown>];
      expect(createArgs.refreshTokenHash).toBe(hashToken('refresh-token'));
      expect(createArgs.ipAddress).toBe(context.ipAddress);
      expect(createArgs.userAgent).toBe(context.userAgent);
    });
  });

  describe('refresh', () => {
    const validSession = () => ({
      _id: new Types.ObjectId(),
      revokedAt: null,
      replacedBySessionId: null,
      refreshTokenHash: hashToken('some-refresh-token'),
    });

    it('re-resolves permissions and accountStatus, rejecting a now-Suspended account', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-id',
        type: 'refresh',
        sessionId: new Types.ObjectId().toString(),
      } as never);
      authSessionsService.findById.mockResolvedValue(validSession() as never);
      usersService.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        accountStatus: 'Suspended',
        roleIds: [],
      } as never);

      await expect(service.refresh('some-refresh-token', context)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token whose type is not "refresh" (an access token presented to /auth/refresh — auth-security-audit-2026-09-05.md P1)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', type: 'access' } as never);

      await expect(service.refresh('an-access-token', context)).rejects.toThrow(UnauthorizedException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('rejects when the session does not exist (auth-security-audit-2026-09-05.md P0 #4)', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-id',
        type: 'refresh',
        sessionId: new Types.ObjectId().toString(),
      } as never);
      authSessionsService.findById.mockResolvedValue(null);

      await expect(service.refresh('some-refresh-token', context)).rejects.toThrow(UnauthorizedException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it('rejects a revoked session (e.g. after logout) even with a signature-valid token', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-id',
        type: 'refresh',
        sessionId: new Types.ObjectId().toString(),
      } as never);
      authSessionsService.findById.mockResolvedValue({ ...validSession(), revokedAt: new Date() } as never);

      await expect(service.refresh('some-refresh-token', context)).rejects.toThrow(UnauthorizedException);
      // Already revoked — no need to revoke it again.
      expect(authSessionsService.revoke).not.toHaveBeenCalled();
    });

    it('rejects and revokes a reused token whose session was already rotated (reuse detection)', async () => {
      const session = { ...validSession(), replacedBySessionId: new Types.ObjectId() };
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-id',
        type: 'refresh',
        sessionId: session._id.toString(),
      } as never);
      authSessionsService.findById.mockResolvedValue(session as never);

      await expect(service.refresh('some-refresh-token', context)).rejects.toThrow(UnauthorizedException);
      expect(authSessionsService.revoke).toHaveBeenCalledWith(session._id);
    });

    it('rejects and revokes when the presented token does not match the session\'s stored hash', async () => {
      const session = validSession();
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-id',
        type: 'refresh',
        sessionId: session._id.toString(),
      } as never);
      authSessionsService.findById.mockResolvedValue(session as never);

      await expect(service.refresh('a-different-token-than-was-hashed', context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(authSessionsService.revoke).toHaveBeenCalledWith(session._id);
    });

    it('issues a fresh access token reflecting current permissions and rotates the session', async () => {
      const session = validSession();
      jwtService.verifyAsync.mockResolvedValue({
        sub: '507f1f77bcf86cd799439011',
        type: 'refresh',
        sessionId: session._id.toString(),
      } as never);
      authSessionsService.findById.mockResolvedValue(session as never);
      usersService.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        accountStatus: 'Active',
        roleIds: [roleId],
      } as never);
      rolesService.findById.mockResolvedValue({ permissionIds: [permissionId] } as never);
      permissionsService.findById.mockResolvedValue({ resourceType: 'roles', action: 'Update' } as never);
      jwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');

      const result = await service.refresh('some-refresh-token', context);

      expect(result.accessToken).toBe('new-access-token');
      const [accessPayload] = jwtService.sign.mock.calls[0] as [Record<string, unknown>];
      expect(accessPayload.permissions).toEqual([{ resourceType: 'roles', action: 'Update' }]);
      // The old session is linked forward to the new one, not deleted — a
      // second presentation of the old token now hits the reuse-detection
      // branch above instead of silently succeeding again.
      expect(authSessionsService.markReplaced).toHaveBeenCalledWith(session._id, expect.any(Types.ObjectId));
    });
  });

  describe('logout', () => {
    it('rejects an unverifiable refresh token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('bad signature'));

      await expect(service.logout('garbage', 'user-id')).rejects.toThrow(UnauthorizedException);
      expect(authSessionsService.revoke).not.toHaveBeenCalled();
    });

    it('rejects a token that does not belong to the caller', async () => {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'someone-else',
        type: 'refresh',
        sessionId: new Types.ObjectId().toString(),
      } as never);

      await expect(service.logout('someone-elses-token', 'user-id')).rejects.toThrow(UnauthorizedException);
      expect(authSessionsService.revoke).not.toHaveBeenCalled();
    });

    it('revokes the session named by a valid, own refresh token', async () => {
      const sessionId = new Types.ObjectId().toString();
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id', type: 'refresh', sessionId } as never);

      await service.logout('a-valid-own-refresh-token', 'user-id');

      expect(authSessionsService.revoke).toHaveBeenCalledWith(sessionId);
    });
  });

  describe('logoutAll', () => {
    it('revokes every session for the given user', async () => {
      await service.logoutAll('user-id');

      expect(authSessionsService.revokeAllForUser).toHaveBeenCalledWith('user-id');
    });
  });
});
