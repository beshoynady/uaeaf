import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { RolesService } from '../roles/roles.service.js';
import { AuthSessionsService } from '../auth-sessions/auth-sessions.service.js';
import { FederationPersonnelsService } from '../../federation-governance/federation-personnel/federation-personnel.service.js';
import { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';

/**
 * Task 5 addendum (owner, 2026-09-27): appointing or revoking the Super Admin
 * role is a recorded security event, alongside — not instead of — the guards
 * already in `assignRoles`. Each event carries the actor and the account
 * affected; a change that does not cross the system-role boundary (adding an
 * ordinary role beside one already held, re-saving the same role) writes
 * neither.
 */
describe('UsersService.assignRoles — Super Admin security events', () => {
  let service: UsersService;
  let repository: jest.Mocked<UsersRepository>;
  let rolesService: jest.Mocked<RolesService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;

  const targetId = new Types.ObjectId().toString();
  const superAdminRoleId = new Types.ObjectId();
  const ordinaryRoleId = new Types.ObjectId();
  const actor: AuthenticatedUser = {
    userId: new Types.ObjectId().toString(),
    roleIds: [],
    permissions: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: {
            findById: jest.fn(),
            updateById: jest.fn(),
            countActiveSuperAdmins: jest.fn(async () => 1),
          },
        },
        {
          provide: RolesService,
          useValue: {
            assertAssignable: jest.fn(async () => undefined),
            resolvePermissionsForRoles: jest.fn(async () => []),
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
    auditLogsService = module.get(AuditLogsService);

    repository.updateById.mockResolvedValue({ _id: new Types.ObjectId(targetId), roleIds: [] } as never);
    rolesService.isSystemRole.mockImplementation(
      async (roleId: string) => roleId === superAdminRoleId.toString(),
    );
  });

  it('writes SuperAdminGranted, naming both the actor and the account, when a system role is newly held', async () => {
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [ordinaryRoleId],
    } as never);

    await service.assignRoles(targetId, [superAdminRoleId], actor, {
      ipAddress: '10.0.0.1',
      userAgent: 'jest',
    });

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SuperAdminGranted',
        actorId: new Types.ObjectId(actor.userId),
        entityType: 'users',
        entityId: new Types.ObjectId(targetId),
        ipAddress: '10.0.0.1',
        userAgent: 'jest',
      }),
    );
  });

  it('writes SuperAdminRevoked when a held system role is dropped', async () => {
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [superAdminRoleId],
    } as never);

    await service.assignRoles(targetId, [ordinaryRoleId], actor);

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SuperAdminRevoked',
        actorId: new Types.ObjectId(actor.userId),
        entityType: 'users',
        entityId: new Types.ObjectId(targetId),
      }),
    );
  });

  it('writes nothing when the system-role status does not change (already held, kept)', async () => {
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [superAdminRoleId],
    } as never);

    await service.assignRoles(targetId, [superAdminRoleId, ordinaryRoleId], actor);

    expect(auditLogsService.write).not.toHaveBeenCalled();
  });

  it('writes nothing when neither before nor after holds a system role', async () => {
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [],
    } as never);

    await service.assignRoles(targetId, [ordinaryRoleId], actor);

    expect(auditLogsService.write).not.toHaveBeenCalled();
  });

  it('still refuses a revocation that would leave no active Super Admin — the guard runs, the event is not a substitute for it', async () => {
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [superAdminRoleId],
    } as never);
    repository.countActiveSuperAdmins.mockResolvedValue(0 as never);

    await expect(service.assignRoles(targetId, [ordinaryRoleId], actor)).rejects.toMatchObject({
      response: { code: 'lastSuperAdmin' },
    });
    expect(repository.updateById).not.toHaveBeenCalled();
    expect(auditLogsService.write).not.toHaveBeenCalled();
  });

  /**
   * Documents an assumption (independent review, round 4, M6), rather than
   * leaving it silent: the transition is computed from
   * `RolesService.isSystemRole`, which answers `true` for ANY seeded system
   * role, not specifically the one named "Super Admin". Accurate today
   * because exactly one system role exists. If a second one is ever seeded,
   * granting IT would also write `SuperAdminGranted` — this test exists so
   * that changing the naming (or narrowing the check to one specific role)
   * is a deliberate choice made against a failing test, not a surprise found
   * in production.
   */
  it('fires for any system role, not specifically one named "Super Admin" — a documented assumption, not a guarantee', async () => {
    const secondSystemRoleId = new Types.ObjectId();
    rolesService.isSystemRole.mockImplementation(
      async (roleId: string) => roleId === secondSystemRoleId.toString(),
    );
    repository.findById.mockResolvedValue({
      _id: new Types.ObjectId(targetId),
      roleIds: [ordinaryRoleId],
    } as never);

    await service.assignRoles(targetId, [secondSystemRoleId], actor);

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SuperAdminGranted' }),
    );
  });
});
