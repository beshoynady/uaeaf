import { jest } from '@jest/globals';
import { ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard.js';
import { REQUIRED_PERMISSION_KEY } from '../decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../interfaces/jwt-payload.interface.js';
import { AuditLogsService } from '../../modules/workflow/audit-logs/audit-logs.service.js';
import { isApiErrorCode } from '../errors/api-error-code.js';

describe('PermissionsGuard', () => {
  const makeContext = (user: AuthenticatedUser | undefined, params: Record<string, string> = {}): ExecutionContext =>
    ({
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user, params, method: 'DELETE', url: '/roles/1', ip: '10.0.0.1', headers: { 'user-agent': 'jest' } }),
      }),
    }) as unknown as ExecutionContext;

  const makeReflector = (required: unknown) =>
    ({ getAllAndOverride: jest.fn().mockReturnValue(required) }) as unknown as Reflector;

  const makeAuditLogsService = () => ({ write: jest.fn() }) as unknown as jest.Mocked<AuditLogsService>;

  it('allows the request when the route declares no required permission', async () => {
    const guard = new PermissionsGuard(makeReflector(undefined), makeAuditLogsService());

    await expect(
      guard.canActivate(makeContext({ userId: 'u1', roleIds: [], permissions: [] })),
    ).resolves.toBe(true);
  });

  it('allows the request when the resolved permission set contains a match', async () => {
    const reflector = makeReflector({ resourceType: 'roles', action: 'ManageRoles' });
    const guard = new PermissionsGuard(reflector, makeAuditLogsService());
    const user: AuthenticatedUser = {
      userId: 'u1',
      roleIds: ['507f1f77bcf86cd799439012'],
      permissions: [{ resourceType: 'roles', action: 'ManageRoles' }],
    };

    await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRED_PERMISSION_KEY, expect.any(Array));
  });

  it('denies and writes an AccessDenied row to auditLogs when a concrete entity id is known', async () => {
    const reflector = makeReflector({ resourceType: 'roles', action: 'ManageRoles' });
    const auditLogsService = makeAuditLogsService();
    const guard = new PermissionsGuard(reflector, auditLogsService);
    const user: AuthenticatedUser = {
      userId: '507f1f77bcf86cd799439011',
      roleIds: ['507f1f77bcf86cd799439012'],
      permissions: [{ resourceType: 'roles', action: 'Read' }],
    };

    await expect(guard.canActivate(makeContext(user, { id: '507f1f77bcf86cd799439099' }))).rejects.toThrow(
      ForbiddenException,
    );

    expect(auditLogsService.write).toHaveBeenCalledTimes(1);
    const [entry] = auditLogsService.write.mock.calls[0];
    expect(entry.action).toBe('AccessDenied');
    expect(entry.entityType).toBe('roles');
    expect((entry.entityId as { toString(): string }).toString()).toBe('507f1f77bcf86cd799439099');
    expect((entry.actorId as { toString(): string }).toString()).toBe('507f1f77bcf86cd799439011');
    expect(entry.reason).toBe('ManageRoles on roles');
  });

  it('writes an AccessDenied row with entityId: null for a collection-level route with no :id', async () => {
    const reflector = makeReflector({ resourceType: 'roles', action: 'Create' });
    const auditLogsService = makeAuditLogsService();
    const guard = new PermissionsGuard(reflector, auditLogsService);
    const user: AuthenticatedUser = {
      userId: '507f1f77bcf86cd799439011',
      roleIds: [],
      permissions: [],
    };

    await expect(guard.canActivate(makeContext(user, {}))).rejects.toThrow(ForbiddenException);

    expect(auditLogsService.write).toHaveBeenCalledTimes(1);
    const [entry] = auditLogsService.write.mock.calls[0];
    expect(entry.action).toBe('AccessDenied');
    expect(entry.entityType).toBe('roles');
    expect(entry.entityId).toBeNull();
    expect(entry.reason).toBe('Create on roles');
  });

  it('falls back to Logger (does not write auditLogs) when there is no authenticated user at all', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const reflector = makeReflector({ resourceType: 'roles', action: 'ManageRoles' });
    const auditLogsService = makeAuditLogsService();
    const guard = new PermissionsGuard(reflector, auditLogsService);

    await expect(guard.canActivate(makeContext(undefined, { id: '507f1f77bcf86cd799439099' }))).rejects.toThrow(
      ForbiddenException,
    );

    expect(auditLogsService.write).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  describe('grant scope', () => {
    const required = { resourceType: 'articles', action: 'Update' };
    const actor = (permissions: AuthenticatedUser['permissions']): AuthenticatedUser => ({
      userId: '507f1f77bcf86cd799439011',
      roleIds: ['507f1f77bcf86cd799439012'],
      permissions,
    });

    it('denies a grant scoped to own with scopedGrantUnsupported', async () => {
      const guard = new PermissionsGuard(makeReflector(required), makeAuditLogsService());
      const user = actor([{ resourceType: 'articles', action: 'Update', scope: 'own' }]);

      await expect(guard.canActivate(makeContext(user))).rejects.toMatchObject({
        response: { code: 'scopedGrantUnsupported' },
      });
    });

    it('keeps scopedGrantUnsupported in the error vocabulary so the filter does not rewrite it', () => {
      expect(isApiErrorCode('scopedGrantUnsupported')).toBe(true);
    });

    it('allows a grant whose scope is null', async () => {
      const guard = new PermissionsGuard(makeReflector(required), makeAuditLogsService());
      const user = actor([{ resourceType: 'articles', action: 'Update', scope: null }]);

      await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    });

    it('allows a grant with no scope key at all', async () => {
      const guard = new PermissionsGuard(makeReflector(required), makeAuditLogsService());
      const user = actor([{ resourceType: 'articles', action: 'Update' }]);

      await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    });

    it('allows a grant scoped to all', async () => {
      const guard = new PermissionsGuard(makeReflector(required), makeAuditLogsService());
      const user = actor([{ resourceType: 'articles', action: 'Update', scope: 'all' }]);

      await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    });

    it('allows the request when one of several grants for the pair is scoped to all', async () => {
      const guard = new PermissionsGuard(makeReflector(required), makeAuditLogsService());
      const user = actor([
        { resourceType: 'articles', action: 'Update', scope: 'own' },
        { resourceType: 'articles', action: 'Update', scope: 'all' },
      ]);

      await expect(guard.canActivate(makeContext(user))).resolves.toBe(true);
    });

    it('records the scoped denial as an AccessDenied row through the existing path', async () => {
      const auditLogsService = makeAuditLogsService();
      const guard = new PermissionsGuard(makeReflector(required), auditLogsService);
      const user = actor([{ resourceType: 'articles', action: 'Update', scope: 'own' }]);

      await expect(guard.canActivate(makeContext(user, { id: '507f1f77bcf86cd799439099' }))).rejects.toThrow(
        ForbiddenException,
      );

      expect(auditLogsService.write).toHaveBeenCalledTimes(1);
      const [entry] = auditLogsService.write.mock.calls[0];
      expect(entry.action).toBe('AccessDenied');
      expect(entry.entityType).toBe('articles');
      expect((entry.entityId as { toString(): string }).toString()).toBe('507f1f77bcf86cd799439099');
      expect((entry.actorId as { toString(): string }).toString()).toBe('507f1f77bcf86cd799439011');
      expect(entry.reason).toBe('Update on articles');
    });

    it('still denies an actor without the pair with the missing-permission message, not the scope code', async () => {
      const guard = new PermissionsGuard(makeReflector(required), makeAuditLogsService());
      const user = actor([{ resourceType: 'articles', action: 'Read', scope: 'all' }]);

      const denial = guard.canActivate(makeContext(user));

      await expect(denial).rejects.toThrow('Missing permission: Update on articles.');
      await expect(denial).rejects.not.toMatchObject({ response: { code: 'scopedGrantUnsupported' } });
    });
  });
});

