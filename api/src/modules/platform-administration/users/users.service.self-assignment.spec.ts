import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { PERMISSION_CATALOGUE } from '../../../common/constants/permission-catalogue.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * Nobody, including a Super Admin, changes the roles on their own account — held
 * by the service as well as the controller, so a caller that reaches
 * `assignRoles` directly meets the same refusal.
 */
describe('UsersService.assignRoles — the self-refusal is in the service too', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;

  const ACTOR_ID = new Types.ObjectId().toString();
  const OTHER_ID = new Types.ObjectId().toString();
  const EVERY_PAIR: AuthenticatedUser['permissions'] = PERMISSION_CATALOGUE.map((entry) => ({
    resourceType: entry.resourceType,
    action: entry.action,
  }));

  const actorOf = (
    userId: string,
    permissions: AuthenticatedUser['permissions'] = [],
  ): AuthenticatedUser => ({ userId, roleIds: [], permissions });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            updateById: jest.fn(),
            countActiveSuperAdmins: jest.fn(),
          },
        },
        {
          provide: RolesService,
          useValue: {
            assertAssignable: jest.fn(),
            resolvePermissionsForRoles: jest.fn(),
            isSystemRole: jest.fn(),
          },
        },
        { provide: AuthSessionsService, useValue: { revokeAllForUser: jest.fn() } },
        { provide: FederationPersonnelsService, useValue: { findById: jest.fn() } },
        { provide: AuditLogsService, useValue: { write: jest.fn() } },
      ],
    }).compile();

    service = module.get(UsersService);
    repository = module.get(UsersRepository);
    rolesService = module.get(RolesService);

    rolesService.assertAssignable.mockResolvedValue(undefined as never);
    rolesService.resolvePermissionsForRoles.mockResolvedValue([] as never);
    rolesService.isSystemRole.mockResolvedValue(false as never);
    repository.findById.mockImplementation(
      async (id: string) => ({ _id: new Types.ObjectId(id), roleIds: [] }) as never,
    );
    repository.updateById.mockImplementation(
      async (id: string) => ({ _id: new Types.ObjectId(id), roleIds: [] }) as never,
    );
  });

  it('refuses when the actor is the target, without reading a single role', async () => {
    await expect(
      service.assignRoles(ACTOR_ID, [new Types.ObjectId()], actorOf(ACTOR_ID)),
    ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

    expect(rolesService.assertAssignable).not.toHaveBeenCalled();
    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('refuses a Super Admin acting on their own account', async () => {
    await expect(
      service.assignRoles(ACTOR_ID, [], actorOf(ACTOR_ID, EVERY_PAIR)),
    ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

    expect(repository.updateById).not.toHaveBeenCalled();
  });

  // Mongoose casts either case of the same 24 hex characters to one document.
  it('refuses an upper-cased spelling of the actor’s own id', async () => {
    await expect(
      service.assignRoles(ACTOR_ID.toUpperCase(), [], actorOf(ACTOR_ID)),
    ).rejects.toMatchObject({ response: { code: 'selfAssignment' } });

    expect(repository.updateById).not.toHaveBeenCalled();
  });

  it('still allows acting on another account', async () => {
    await expect(service.assignRoles(OTHER_ID, [], actorOf(ACTOR_ID))).resolves.toBeDefined();

    expect(repository.updateById).toHaveBeenCalledWith(OTHER_ID, { roleIds: [] });
  });
});
