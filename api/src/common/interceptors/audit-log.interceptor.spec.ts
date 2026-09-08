import { jest } from '@jest/globals';
import { of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { AuditLogsService } from '../../modules/workflow/audit-logs/audit-logs.service.js';
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
      return auditLogsService.write.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
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
});
