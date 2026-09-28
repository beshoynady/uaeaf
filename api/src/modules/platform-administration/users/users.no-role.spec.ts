import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * The marker means "no live role resolves", not "roleIds is empty" (See ADR-0113).
 * `RolesService.findAll` answers live roles only, so an archived id is absent from it.
 */
describe('the "no role" marker', () => {
  const ARCHIVED_ROLE_ID = new Types.ObjectId();
  const LIVE_ROLE_ID = new Types.ObjectId();

  const userWith = (roleIds: Types.ObjectId[]) => ({
    _id: new Types.ObjectId(),
    name: { en: 'Sara', ar: 'سارة' },
    email: 'sara@uaeaf.ae',
    roleIds,
    personId: null,
    accountStatus: 'Active',
    lastLogin: null,
    photoId: null,
    preferredLanguage: null,
    preferredTheme: null,
  });

  // Three rows, so a per-row role lookup calls three times and the N+1 test can fail.
  const USERS = [userWith([ARCHIVED_ROLE_ID]), userWith([LIVE_ROLE_ID]), userWith([])];

  let controller: UsersController;
  let rolesService: jest.Mocked<RolesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            find: jest.fn(async () => USERS),
            findById: jest.fn(async (id: string) => USERS.find((u) => u._id.toString() === id) ?? null),
          },
        },
        { provide: RolesService, useValue: { findAll: jest.fn(async () => [{ _id: LIVE_ROLE_ID }]) } },
        { provide: AuthSessionsService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: FederationPersonnelsService, useValue: { findById: jest.fn() } },
        { provide: AuditLogsService, useValue: { write: jest.fn() } },
      ],
    }).compile();

    controller = module.get(UsersController);
    rolesService = module.get(RolesService);
  });

  it('marks an account whose roleIds all point at archived roles', async () => {
    expect((await controller.findAll())[0].hasNoRole).toBe(true);
  });

  it('marks an account holding no role id at all', async () => {
    expect((await controller.findAll())[2].hasNoRole).toBe(true);
  });

  it('does not mark an account holding one live role', async () => {
    expect((await controller.findAll())[1].hasNoRole).toBe(false);
  });

  const actorFor = (user: (typeof USERS)[number]): AuthenticatedUser => ({
    userId: user._id.toString(),
    roleIds: user.roleIds.map((roleId) => roleId.toString()),
    permissions: [],
  });

  it('marks the caller of /users/me whose roleIds all point at archived roles', async () => {
    expect((await controller.me(actorFor(USERS[0]))).hasNoRole).toBe(true);
  });

  it('does not mark the caller of /users/me holding one live role', async () => {
    expect((await controller.me(actorFor(USERS[1]))).hasNoRole).toBe(false);
  });

  it('resolves the live-role set once for a list of three, not once per row', async () => {
    await controller.findAll();
    expect(rolesService.findAll).toHaveBeenCalledTimes(1);
  });
});
