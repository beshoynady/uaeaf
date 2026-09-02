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

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let rolesService: jest.Mocked<RolesService>;
  let permissionsService: jest.Mocked<PermissionsService>;
  let jwtService: jest.Mocked<JwtService>;

  const roleId = new Types.ObjectId();
  const permissionId = new Types.ObjectId();

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
        { provide: JwtService, useValue: { sign: jest.fn(), verifyAsync: jest.fn() } },
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
    jwtService = module.get(JwtService);
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

      await expect(service.login({ email: 'nobody@uaeaf.ae', password: 'whatever12345' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password and records the failed attempt', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      user.failedLoginAttempts = 2;
      usersService.findByEmail.mockResolvedValue(user as never);

      await expect(
        service.login({ email: 'sara@uaeaf.ae', password: 'wrong-password' }),
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.recordFailedLogin).toHaveBeenCalledWith(user._id.toString(), 2);
    });

    it('rejects a correct password on a Suspended account', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      user.accountStatus = 'Suspended';
      usersService.findByEmail.mockResolvedValue(user as never);

      await expect(
        service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects login while locked, without checking the password or recording another attempt', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      user.failedLoginAttempts = 5;
      user.lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
      usersService.findByEmail.mockResolvedValue(user as never);
      const compareSpy = jest.spyOn(bcrypt, 'compare');

      await expect(
        service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' }),
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

      const result = await service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' });

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(usersService.recordSuccessfulLogin).toHaveBeenCalledWith(user._id.toString());
    });

    it('issues tokens with the resolved permission set on success', async () => {
      const user = await activeUserWithLocalPassword('correct-password');
      usersService.findByEmail.mockResolvedValue(user as never);
      rolesService.findById.mockResolvedValue({ permissionIds: [permissionId] } as never);
      permissionsService.findById.mockResolvedValue({ resourceType: 'users', action: 'Read' } as never);
      jwtService.sign.mockReturnValueOnce('access-token').mockReturnValueOnce('refresh-token');

      const result = await service.login({ email: 'sara@uaeaf.ae', password: 'correct-password' });

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(usersService.recordSuccessfulLogin).toHaveBeenCalledWith(user._id.toString());
      const [accessPayload, accessOptions] = jwtService.sign.mock.calls[0] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(accessPayload).toEqual({
        sub: user._id.toString(),
        permissions: [{ resourceType: 'users', action: 'Read' }],
      });
      expect(accessOptions).toMatchObject({ expiresIn: '15m' });
      const [refreshPayload, refreshOptions] = jwtService.sign.mock.calls[1] as [
        Record<string, unknown>,
        Record<string, unknown>,
      ];
      expect(refreshPayload).toEqual({ sub: user._id.toString() });
      expect(refreshOptions).toMatchObject({ expiresIn: '7d' });
    });
  });

  describe('refresh', () => {
    it('re-resolves permissions and accountStatus, rejecting a now-Suspended account', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' } as never);
      usersService.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        accountStatus: 'Suspended',
        roleIds: [],
      } as never);

      await expect(service.refresh('some-refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('issues a fresh access token reflecting current permissions', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' } as never);
      usersService.findById.mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        accountStatus: 'Active',
        roleIds: [roleId],
      } as never);
      rolesService.findById.mockResolvedValue({ permissionIds: [permissionId] } as never);
      permissionsService.findById.mockResolvedValue({ resourceType: 'roles', action: 'Update' } as never);
      jwtService.sign.mockReturnValueOnce('new-access-token').mockReturnValueOnce('new-refresh-token');

      const result = await service.refresh('some-refresh-token');

      expect(result.accessToken).toBe('new-access-token');
      const [accessPayload] = jwtService.sign.mock.calls[0] as [Record<string, unknown>];
      expect(accessPayload.permissions).toEqual([{ resourceType: 'roles', action: 'Update' }]);
    });
  });
});
