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

  /** `extractRequestContext` only needs these two — a fake request is enough
   *  for every call here, self-refused or not. */
  const req = { ip: '127.0.0.1', headers: {} } as never;

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
            updateAccountStatus: jest.fn(),
            updatePreferences: jest.fn(),
            remove: jest.fn(),
            unarchive: jest.fn(),
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

  /**
   * The self-action refusals predate ADR-0104's two rules and are kept beside
   * them, deliberately.
   *
   * Nobody, including a Super Admin, may change the roles on their own account —
   * which no other rule expresses: rules 1 and 2 both compare the actor against
   * something else, and comparing an actor with themselves always passes.
   *
   * These tests also pin the ORDER. Both the self-refusal and the last-holder
   * refusal can apply to the same request, and the controller's self-check runs
   * first, so the caller sees `selfAssignment`. That is acceptable — both refuse,
   * and the account is unchanged either way — but it must not change by
   * accident, because the two refusals tell the administrator to do different
   * things.
   */
  describe('self-action refusals', () => {
    const other = new Types.ObjectId().toString();

    // ObjectId.isValid accepts either case and Mongoose casts both to the same
    // document, so a string compare let an upper-cased hex id through to the
    // caller's own record.
    it('refuses self role-assignment given the id in upper case', async () => {
      await expect(
        controller.assignRoles(userId.toUpperCase(), { roleIds: [] }, actor([]), req),
      ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

      expect(usersService.assignRoles).not.toHaveBeenCalled();
    });

    it('refuses a self status change given the id in upper case', async () => {
      await expect(
        controller.updateStatus(userId.toUpperCase(), { accountStatus: 'Suspended' }, actor([])),
      ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

      expect(usersService.updateAccountStatus).not.toHaveBeenCalled();
    });

    it('refuses self role-assignment, and never reaches the service', async () => {
      await expect(
        controller.assignRoles(userId, { roleIds: [] }, actor([]), req),
      ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

      expect(usersService.assignRoles).not.toHaveBeenCalled();
    });

    /**
     * Task 5 addendum (owner, 2026-09-27): pinned explicitly, because the
     * reserved-pair check that used to sit in `assertAssignableByActor` was
     * removed from the assign path (Decision 4 refuses a reserved pair only
     * when a role is BUILT, not when it is handed out — see
     * `users.service.authority.spec.ts`). This self-check is unrelated and
     * untouched by that change — it runs in the controller, before any role
     * content is even looked at — but the removal is exactly the kind of
     * change that could quietly have taken a neighbouring protection with
     * it, so it is pinned here rather than assumed.
     */
    it('refuses self-assignment of the Super Admin role too — not even a Super Admin may grant it to themselves', async () => {
      const superAdminRoleId = new Types.ObjectId().toString();

      await expect(
        controller.assignRoles(userId, { roleIds: [superAdminRoleId] }, actor([]), req),
      ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

      expect(usersService.assignRoles).not.toHaveBeenCalled();
    });

    it('refuses changing your own account status, and never reaches the service', async () => {
      await expect(
        controller.updateStatus(userId, { accountStatus: 'Suspended' }, actor([])),
      ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

      expect(usersService.updateAccountStatus).not.toHaveBeenCalled();
    });

    it('lets a change to somebody else through to the service, where the two rules apply', async () => {
      usersService.assignRoles.mockResolvedValue({ _id: other } as never);

      await controller.assignRoles(other, { roleIds: [] }, actor([]), req);

      expect(usersService.assignRoles).toHaveBeenCalledWith(other, [], actor([]), { ipAddress: '127.0.0.1', userAgent: '' });
    });

    it('reports the self refusal first when the last-holder rule would also refuse', async () => {
      usersService.updateAccountStatus.mockRejectedValue(
        new Error('the service should never be reached here') as never,
      );

      await expect(
        controller.updateStatus(userId, { accountStatus: 'Suspended' }, actor([])),
      ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });
    });

    /** Archiving your own account leaves nobody able to bring it back through
     *  the API — the same reason the status change refuses it. */
    it('refuses archiving your own account, and never reaches the service', async () => {
      await expect(controller.remove(userId, actor([]))).rejects.toMatchObject({
        response: { code: 'selfAssignment' },
      });

      expect(usersService.remove).not.toHaveBeenCalled();
    });

    it('archives somebody else, where the stronger-target and last-holder rules apply', async () => {
      usersService.remove.mockResolvedValue({ _id: other } as never);

      await controller.remove(other, actor([]));

      expect(usersService.remove).toHaveBeenCalledWith(other, actor([]));
    });

    it('404s rather than answering an empty 200 for an id that archives nothing', async () => {
      usersService.remove.mockResolvedValue(null as never);

      await expect(controller.remove(other, actor([]))).rejects.toBeInstanceOf(NotFoundException);
    });

    it('404s rather than answering an empty 200 for an id that restores nothing', async () => {
      usersService.unarchive.mockResolvedValue(null as never);

      await expect(controller.unarchive(other)).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
