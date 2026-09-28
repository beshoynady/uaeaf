import { jest } from '@jest/globals';
import { of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { AuditLogsService } from '../../modules/workflow/audit-logs/audit-logs.service.js';
import { REQUIRED_PERMISSION_KEY } from '../decorators/permissions.decorator.js';
import type { Connection } from 'mongoose';

describe('AuditLogInterceptor', () => {
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let reflector: jest.Mocked<Reflector>;
  let interceptor: AuditLogInterceptor;
  let findOne: jest.Mock<() => Promise<Record<string, unknown> | null>>;
  let collection: jest.Mock<(name: string) => unknown>;

  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    auditLogsService = { write: jest.fn() } as unknown as jest.Mocked<AuditLogsService>;
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as jest.Mocked<Reflector>;
    // The pre-read that captures `previousValue` goes through the raw
    // collection named by the route segment — no model registry, so the
    // interceptor stays generic over every module.
    findOne = jest.fn(async () => null);
    collection = jest.fn(() => ({ findOne }));
    const connection = { collection } as unknown as Connection;
    interceptor = new AuditLogInterceptor(auditLogsService, reflector, connection);
  });

  function makeContext(request: Record<string, unknown>): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  }

  function makeHandler(responseBody: unknown): CallHandler {
    return { handle: () => of(responseBody) };
  }

  it('does not write to auditLogs for a GET request', async () => {
    const request = { method: 'GET', url: '/api/v1/roles', params: {}, headers: {} };
    const context = makeContext(request);

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler({})).subscribe(() => resolve());
    });

    expect(auditLogsService.write).not.toHaveBeenCalled();
  });

  it('writes a Create entry for a successful POST, using the created id from the response', async () => {
    const createdId = new Types.ObjectId().toString();
    const request = {
      method: 'POST',
      url: '/api/v1/roles',
      params: {},
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
      user: { userId, permissions: [] },
    };
    const context = makeContext(request);
    const responseBody = { _id: createdId, name: { en: 'News Approver', ar: 'معتمد الأخبار' } };

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler(responseBody)).subscribe(() => resolve());
    });
    await Promise.resolve();

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'Create',
        entityType: 'roles',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
        newValue: responseBody,
      }),
    );
  });

  it('writes a Delete entry for a successful DELETE, using the :id route param', async () => {
    const targetId = new Types.ObjectId().toString();
    const request = {
      method: 'DELETE',
      url: `/api/v1/roles/${targetId}`,
      params: { id: targetId },
      headers: {},
      user: { userId, permissions: [] },
    };
    const context = makeContext(request);

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler(null)).subscribe(() => resolve());
    });
    await Promise.resolve();

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'Delete', entityType: 'roles' }),
    );
    const [call] = auditLogsService.write.mock.calls[0] as [{ entityId: Types.ObjectId }];
    expect(call.entityId.toString()).toBe(targetId);
  });

  it('converts a multi-word kebab-case route into the camelCase entityType used by the workflow subsystem', async () => {
    const createdId = new Types.ObjectId().toString();
    const request = {
      method: 'POST',
      url: '/api/v1/athlete-profiles',
      params: {},
      headers: {},
      user: { userId, permissions: [] },
    };
    const context = makeContext(request);
    const responseBody = { _id: createdId };

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler(responseBody)).subscribe(() => resolve());
    });
    await Promise.resolve();

    expect(auditLogsService.write).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: 'athleteProfiles' }),
    );
  });

  it('does nothing when the route is marked @SkipAuditLog', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const request = {
      method: 'POST',
      url: '/api/v1/workflow-instances/abc/approve',
      params: {},
      headers: {},
      user: { userId, permissions: [] },
    };
    const context = makeContext(request);

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler({})).subscribe(() => resolve());
    });
    await Promise.resolve();

    expect(auditLogsService.write).not.toHaveBeenCalled();
  });

  it('does not throw and does not write when there is no authenticated user', async () => {
    const request = { method: 'POST', url: '/api/v1/auth/login', params: {}, headers: {} };
    const context = makeContext(request);

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler({ accessToken: 'x' })).subscribe(() => resolve());
    });
    await Promise.resolve();

    expect(auditLogsService.write).not.toHaveBeenCalled();
  });

  // Regression test for the api/v1 prefix rollout (2026-09-06): before the
  // fix, entityType was read off url.split('/')[0], which used to be the
  // real entity segment ('roles') but became the literal prefix ('api')
  // once every route moved under /api/v1/... -- this would have silently
  // mislabeled every audit log entry going forward.
  it('strips the /api/v1 prefix so entityType is the real route segment, not "api"', async () => {
    const createdId = new Types.ObjectId().toString();
    const request = {
      method: 'POST',
      url: '/api/v1/roles',
      params: {},
      headers: {},
      user: { userId, permissions: [] },
    };
    const context = makeContext(request);
    const responseBody = { _id: createdId };

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler(responseBody)).subscribe(() => resolve());
    });
    await Promise.resolve();

    expect(auditLogsService.write).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'roles' }));
  });

  /**
   * The action a request logs under now comes from the route's own
   * `@RequirePermission` action when that action is `Archive`, `Restore` or
   * `PermanentDelete` — not from the HTTP method alone (owner decision
   * 2026-09-27). Before this, every `@Delete()` route logged `Delete`
   * regardless of what it actually did.
   */
  describe('action derivation from the route permission (2026-09-27)', () => {
    const withPermission = (action: string) =>
      jest.fn((key: unknown) => (key === REQUIRED_PERMISSION_KEY ? { resourceType: 'x', action } : false));

    it('logs Archive for an archive route, not the generic Delete a plain DELETE would give', async () => {
      reflector.getAllAndOverride = withPermission('Archive') as never;
      const request = {
        method: 'DELETE',
        url: '/api/v1/articles/abc',
        params: { id: new Types.ObjectId().toString() },
        headers: {},
        user: { userId, permissions: [] },
      };

      await new Promise<void>((resolve) => {
        interceptor.intercept(makeContext(request), makeHandler({ archivedAt: new Date() })).subscribe(() => resolve());
      });
      await Promise.resolve();

      expect(auditLogsService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'Archive' }));
    });

    it('logs Restore for a restore route, not the generic Create a plain POST would give', async () => {
      reflector.getAllAndOverride = withPermission('Restore') as never;
      const request = {
        method: 'POST',
        url: '/api/v1/articles/abc/restore',
        params: { id: new Types.ObjectId().toString() },
        headers: {},
        user: { userId, permissions: [] },
      };

      await new Promise<void>((resolve) => {
        interceptor.intercept(makeContext(request), makeHandler({})).subscribe(() => resolve());
      });
      await Promise.resolve();

      expect(auditLogsService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'Restore' }));
    });

    it('logs PermanentDelete for the real destruction — and it is not what an archive produces', async () => {
      reflector.getAllAndOverride = withPermission('PermanentDelete') as never;
      const request = {
        method: 'DELETE',
        url: '/api/v1/media-assets/abc/object',
        params: { id: new Types.ObjectId().toString() },
        headers: {},
        user: { userId, permissions: [] },
      };

      await new Promise<void>((resolve) => {
        interceptor.intercept(makeContext(request), makeHandler(null)).subscribe(() => resolve());
      });
      await Promise.resolve();

      const [call] = auditLogsService.write.mock.calls[0] as [{ action: string }];
      expect(call.action).toBe('PermanentDelete');
    });

    it('still logs Update for an ordinary PATCH whose permission is not one of the three overrides', async () => {
      reflector.getAllAndOverride = withPermission('Update') as never;
      const request = {
        method: 'PATCH',
        url: '/api/v1/articles/abc',
        params: { id: new Types.ObjectId().toString() },
        headers: {},
        user: { userId, permissions: [] },
      };

      await new Promise<void>((resolve) => {
        interceptor.intercept(makeContext(request), makeHandler({})).subscribe(() => resolve());
      });
      await Promise.resolve();

      expect(auditLogsService.write).toHaveBeenCalledWith(expect.objectContaining({ action: 'Update' }));
    });

    /**
     * Independent review, round 4 (confirmed live for this batch): the
     * override used to check the permission BEFORE the method, so a GET
     * route guarded by one of the three override verbs — exactly what
     * `GET /media-assets/unused` (Task 10) is specified to be, behind
     * `mediaAssets:PermanentDelete` — would answer `PermanentDelete` and
     * write an audit row claiming a permanent deletion happened because
     * somebody opened a report. A non-mutating method must never be
     * audited, whatever the permission verb says.
     */
    it('writes nothing for a GET, even one guarded by a destructive permission', async () => {
      reflector.getAllAndOverride = withPermission('PermanentDelete') as never;
      const request = {
        method: 'GET',
        url: '/api/v1/media-assets/unused',
        params: {},
        headers: {},
        user: { userId, permissions: [] },
      };

      await new Promise<void>((resolve) => {
        interceptor.intercept(makeContext(request), makeHandler({ items: [] })).subscribe(() => resolve());
      });
      await Promise.resolve();

      expect(auditLogsService.write).not.toHaveBeenCalled();
    });
  });

  describe('previousValue', () => {
    const entityId = new Types.ObjectId().toString();

    const patchRequest = () => ({
      method: 'PATCH',
      url: `/api/v1/roles/${entityId}/permissions`,
      params: { id: entityId },
      headers: { 'user-agent': 'jest' },
      ip: '127.0.0.1',
      user: { userId, permissions: [] },
    });

    async function run(responseBody: unknown) {
      await new Promise<void>((resolve) => {
        interceptor
          .intercept(makeContext(patchRequest()), makeHandler(responseBody))
          .subscribe(() => resolve());
      });
      return auditLogsService.write.mock.calls[0]?.[0];
    }

    it('records the record as it was before the change', async () => {
      // Until 2026-09-08 only `newValue` was written, so the trail said what
      // a record became and never what it had been — which makes "who
      // changed this, and from what" unanswerable.
      findOne.mockResolvedValue({ _id: entityId, name: { en: 'Editor', ar: 'محرّر' }, permissionIds: ['p1'] });

      const entry = await run({ _id: entityId, permissionIds: ['p1', 'p2'] });

      expect(collection).toHaveBeenCalledWith('roles');
      expect(entry?.previousValue).toMatchObject({ permissionIds: ['p1'] });
      expect(entry?.newValue).toMatchObject({ permissionIds: ['p1', 'p2'] });
    });

    it('never writes a credential into the trail', async () => {
      // The pre-image is read straight from storage, and a stored user
      // document carries authMethods[].passwordHash.
      findOne.mockResolvedValue({
        _id: entityId,
        email: 'noor@uaeaf.ae',
        authMethods: [{ provider: 'Local', passwordHash: '$2a$10$reallysecret' }],
      });

      const entry = await run({ id: entityId, email: 'noor@uaeaf.ae' });

      expect(JSON.stringify(entry?.previousValue)).not.toContain('reallysecret');
      expect(entry?.previousValue).not.toHaveProperty('authMethods');
    });

    it('still writes the row when the before-state cannot be read', async () => {
      // An audit row without a before-state is worth more than no row, and
      // far more than refusing the user's request over a failed snapshot.
      findOne.mockRejectedValue(new Error('no such collection'));

      const entry = await run({ _id: entityId });

      expect(entry).toBeDefined();
      expect(entry?.previousValue).toBeNull();
    });

    it('takes no snapshot for a creation, because there is nothing yet', async () => {
      const request = {
        method: 'POST',
        url: '/api/v1/roles',
        params: {},
        headers: {},
        user: { userId, permissions: [] },
      };

      await new Promise<void>((resolve) => {
        interceptor
          .intercept(makeContext(request), makeHandler({ _id: entityId }))
          .subscribe(() => resolve());
      });

      expect(collection).not.toHaveBeenCalled();
      expect(auditLogsService.write.mock.calls[0]?.[0]).toMatchObject({ previousValue: null });
    });
  });

  /**
   * ADR-0112 — a write that cannot be attributed is still recorded.
   *
   * The early return this replaced dropped the row entirely, and dropped it
   * precisely for routes whose shape is unusual: no `:id` in the path and no id
   * in the response. `PUT /workflow-policies/:entityType/approval` is exactly
   * that shape, so turning the federation's approval requirement on or off for a
   * content type wrote nothing at all.
   */
  describe('when nothing can name the record', () => {
    const run = async (request: Record<string, unknown>, responseBody: unknown) => {
      await new Promise<void>((resolve) => {
        interceptor.intercept(makeContext(request), makeHandler(responseBody)).subscribe(() => resolve());
      });
    };

    it('still writes the row, with a null entity id and a reason', async () => {
      await run(
        {
          method: 'PATCH',
          url: '/api/v1/workflow-policies/articles/approval',
          params: {},
          headers: {},
          user: { userId, roleIds: [], permissions: [] },
        },
        undefined,
      );

      expect(auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'workflowPolicies',
          entityId: null,
          reason: 'entity id unresolved',
        }),
      );
    });

    it('prefers the path id when there is one', async () => {
      const id = new Types.ObjectId().toString();

      await run(
        {
          method: 'PATCH',
          url: '/api/v1/articles/whatever',
          params: { id },
          headers: {},
          user: { userId, roleIds: [], permissions: [] },
        },
        { _id: new Types.ObjectId().toString() },
      );

      expect(auditLogsService.write.mock.calls[0]?.[0]).toMatchObject({
        entityId: new Types.ObjectId(id),
      });
    });

    // An id-shaped value that is not an ObjectId used to reach `new
    // Types.ObjectId(...)` and throw inside the interceptor, failing the
    // request it was only meant to observe.
    it('treats an unusable id as no id rather than throwing', async () => {
      await run(
        {
          method: 'DELETE',
          url: '/api/v1/articles/not-an-object-id',
          params: { id: 'not-an-object-id' },
          headers: {},
          user: { userId, roleIds: [], permissions: [] },
        },
        undefined,
      );

      expect(auditLogsService.write.mock.calls[0]?.[0]).toMatchObject({ entityId: null });
    });

    it('uses @AuditEntity for the type and records the subject it names', async () => {
      reflector.getAllAndOverride = jest.fn((key: unknown) =>
        key === 'auditEntity' ? { type: 'workflowPolicies', idFrom: 'entityType' } : false,
      ) as never;

      await run(
        {
          method: 'PUT',
          url: '/api/v1/some-other-route/articles/Edit',
          params: { entityType: 'articles' },
          headers: {},
          user: { userId, roleIds: [], permissions: [] },
        },
        undefined,
      );

      expect(auditLogsService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'workflowPolicies',
          entityId: null,
          reason: 'entity id unresolved (subject: articles)',
        }),
      );
    });
  });
});
