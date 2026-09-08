import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const userId = new Types.ObjectId().toString();
  const roleId = new Types.ObjectId().toString();

  const actor = (permissions: AuthenticatedUser['permissions']): AuthenticatedUser => ({
    userId,
    roleIds: [roleId],
    permissions,
  });

  const profile = {
    id: userId,
    name: { en: 'Sara', ar: 'سارة' },
    email: 'sara@uaeaf.ae',
    roleIds: [roleId],
    personId: null,
    accountStatus: 'Active' as const,
    lastLogin: null,
    photoId: null,
    preferredLanguage: null,
    preferredTheme: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findById: jest.fn(),
            toResponse: jest.fn(() => profile),
            create: jest.fn(),
            findAll: jest.fn(),
            assignRoles: jest.fn(),
            updatePreferences: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(UsersController);
    usersService = module.get(UsersService);
  });

  describe('GET /users/me', () => {
    /* The dashboard shell renders its navigation from this response
     * (apps/dashboard .../(app)/layout.tsx). Before the 2026-09-07 token
     * decision it read the permission set out of the JWT; the token no
     * longer carries one, so the authority has to arrive here instead — and
     * on the call the layout already makes, not a second round trip. */

    it("returns the caller's resolved permissions alongside their profile", async () => {
      usersService.findById.mockResolvedValue({} as never);
      const permissions = [
        { resourceType: 'users', action: 'Read' },
        { resourceType: 'roles', action: 'Update' },
      ] as AuthenticatedUser['permissions'];

      const result = await controller.me(actor(permissions));

      expect(result.permissions).toEqual(permissions);
      expect(result.email).toBe('sara@uaeaf.ae');
    });

    it('reads the permissions off the request, issuing no extra query for them', async () => {
      usersService.findById.mockResolvedValue({} as never);

      await controller.me(actor([]));

      // One read: the profile. JwtStrategy already resolved the authority
      // for this request, so asking the database again would be waste.
      expect(usersService.findById).toHaveBeenCalledTimes(1);
    });

    it('reports an empty permission set as empty, not as absent', async () => {
      // A user whose roles were all withdrawn. The dashboard must render an
      // empty navigation, which it can only do if the field is present.
      usersService.findById.mockResolvedValue({} as never);

      const result = await controller.me(actor([]));

      expect(result.permissions).toEqual([]);
    });

    it('still 404s for a valid token whose user no longer exists', async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(controller.me(actor([]))).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
