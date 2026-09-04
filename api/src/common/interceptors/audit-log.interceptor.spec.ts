import { jest } from '@jest/globals';
import { of } from 'rxjs';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Types } from 'mongoose';
import { AuditLogInterceptor } from './audit-log.interceptor.js';
import { AuditLogsService } from '../../modules/workflow/audit-logs/audit-logs.service.js';

describe('AuditLogInterceptor', () => {
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let reflector: jest.Mocked<Reflector>;
  let interceptor: AuditLogInterceptor;

  const userId = new Types.ObjectId().toString();

  beforeEach(() => {
    auditLogsService = { write: jest.fn() } as unknown as jest.Mocked<AuditLogsService>;
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as unknown as jest.Mocked<Reflector>;
    interceptor = new AuditLogInterceptor(auditLogsService, reflector);
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
    const request = { method: 'GET', url: '/roles', params: {}, headers: {} };
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
      url: '/roles',
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
      url: `/roles/${targetId}`,
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
      url: '/athlete-profiles',
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
      url: '/workflow-instances/abc/approve',
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
    const request = { method: 'POST', url: '/auth/login', params: {}, headers: {} };
    const context = makeContext(request);

    await new Promise<void>((resolve) => {
      interceptor.intercept(context, makeHandler({ accessToken: 'x' })).subscribe(() => resolve());
    });
    await Promise.resolve();

    expect(auditLogsService.write).not.toHaveBeenCalled();
  });
});
