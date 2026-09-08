import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';

/**
 * Covers build-plan open items 20, 22 and 24:
 *
 * - a duplicate email escaped as a bare 500 because nothing caught E11000;
 * - role ids were stored without checking they resolve to anything;
 * - `accountStatus` had no writer at all, so suspending an account meant
 *   editing the database by hand.
 */
describe('UsersService — lifecycle', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;
  let authSessions: jest.Mocked<AuthSessionsService>;

  const id = new Types.ObjectId().toString();
  const name = { en: 'Noor Al Hammadi', ar: 'نور الحمادي' };

  const stored = (over: Record<string, unknown> = {}) =>
    ({
      _id: new Types.ObjectId(id),
      name,
      email: 'noor@uaeaf.ae',
      roleIds: [],
      personId: null,
      accountStatus: 'Active',
      lastLogin: null,
      photoId: null,
      preferredLanguage: null,
      preferredTheme: null,
      ...over,
    }) as never;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: { create: jest.fn(), findByEmail: jest.fn(), updateById: jest.fn() },
        },
        { provide: RolesService, useValue: { assertAssignable: jest.fn() } },
        { provide: AuthSessionsService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: FederationPersonnelsService, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
    rolesService = module.get(RolesService);
    authSessions = module.get(AuthSessionsService);
  });

  describe('create', () => {
    it('reports a taken email as a conflict, naming what collided', async () => {
      // Previously this reached the caller as a bare 500: there was no
      // try/catch here and the API registered no exception filter, so
      // MongoDB's E11000 escaped unwrapped.
      repository.create.mockRejectedValue({ code: 11000, keyValue: { email: 'noor@uaeaf.ae' } } as never);

      const error = await service
        .create({ name, email: 'noor@uaeaf.ae', password: 'a-long-enough-password' })
        .catch((caught: unknown) => caught);

      expect(error).toBeInstanceOf(ConflictException);
      expect(JSON.stringify((error as ConflictException).getResponse())).toContain('email');
    });

    it('lets an unrelated failure through unchanged', async () => {
      // Only the duplicate-key shape is translated. Swallowing anything else
      // into a conflict would report a database outage as a naming clash.
      const outage = new Error('connection timed out');
      repository.create.mockRejectedValue(outage as never);

      await expect(
        service.create({ name, email: 'noor@uaeaf.ae', password: 'a-long-enough-password' }),
      ).rejects.toBe(outage);
    });
  });

  describe('assignRoles', () => {
    it('refuses ids that do not resolve, before writing anything', async () => {
      rolesService.assertAssignable.mockRejectedValue(new Error('unknown role') as never);
      const roleIds = [new Types.ObjectId()];

      await expect(service.assignRoles(id, roleIds)).rejects.toThrow('unknown role');
      expect(repository.updateById).not.toHaveBeenCalled();
    });

    it('validates against the roles collection, not just the id format', async () => {
      const roleIds = [new Types.ObjectId(), new Types.ObjectId()];
      rolesService.assertAssignable.mockResolvedValue(undefined as never);
      repository.updateById.mockResolvedValue(stored({ roleIds }));

      await service.assignRoles(id, roleIds);

      expect(rolesService.assertAssignable).toHaveBeenCalledWith(roleIds.map(String));
      expect(repository.updateById).toHaveBeenCalledWith(id, { roleIds });
    });

    it('reports an unknown account as not found rather than an empty success', async () => {
      rolesService.assertAssignable.mockResolvedValue(undefined as never);
      repository.updateById.mockResolvedValue(null);

      await expect(service.assignRoles(id, [])).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('updateAccountStatus', () => {
    it('records the new status and returns the public shape', async () => {
      repository.updateById.mockResolvedValue(stored({ accountStatus: 'Suspended' }));

      const result = await service.updateAccountStatus(id, 'Suspended');

      expect(repository.updateById).toHaveBeenCalledWith(id, { accountStatus: 'Suspended' });
      expect(result.accountStatus).toBe('Suspended');
    });

    it('revokes every live session when an account stops being active', async () => {
      // Without this the account is refused at the next login and at the
      // next refresh, but any access token already issued keeps working for
      // the rest of its fifteen minutes — a suspension that does not take
      // effect until it expires is not a suspension.
      repository.updateById.mockResolvedValue(stored({ accountStatus: 'Suspended' }));

      await service.updateAccountStatus(id, 'Suspended');

      expect(authSessions.revokeAllForUser).toHaveBeenCalledWith(id);
    });

    it('revokes on deactivation too', async () => {
      repository.updateById.mockResolvedValue(stored({ accountStatus: 'Deactivated' }));

      await service.updateAccountStatus(id, 'Deactivated');

      expect(authSessions.revokeAllForUser).toHaveBeenCalledWith(id);
    });

    it('does not revoke when an account is being restored to active', async () => {
      // Reactivating is not a security event, and signing the person out of
      // a session they do not have would do nothing but cost a write.
      repository.updateById.mockResolvedValue(stored({ accountStatus: 'Active' }));

      await service.updateAccountStatus(id, 'Active');

      expect(authSessions.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('reports an unknown account as not found, and revokes nothing', async () => {
      repository.updateById.mockResolvedValue(null);

      await expect(service.updateAccountStatus(id, 'Suspended')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(authSessions.revokeAllForUser).not.toHaveBeenCalled();
    });
  });
});
