import { jest } from '@jest/globals';
import { ForbiddenException, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum.js';
import { Types } from 'mongoose';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import type { RolesRepository } from './roles.repository.js';
import type { RoleAssignmentsRepository } from './role-assignments.repository.js';
import type { PermissionsService } from '../permissions/permissions.service.js';

const WRITE_METHODS: ReadonlySet<RequestMethod> = new Set([
  RequestMethod.POST,
  RequestMethod.PATCH,
  RequestMethod.PUT,
  RequestMethod.DELETE,
]);

// Read from the metadata Nest routes by, not from the controller's text, so no
// decorator shape can hide a route. See ADR-0104.
const mutatingRoutes = (): { path: string; handler: string }[] =>
  Object.getOwnPropertyNames(RolesController.prototype)
    .filter((name) => name !== 'constructor')
    .flatMap((name) => {
      const handler = (RolesController.prototype as unknown as Record<string, object>)[name];
      const path: string | undefined = Reflect.getMetadata(PATH_METADATA, handler);
      const method: RequestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
      return path !== undefined && WRITE_METHODS.has(method) ? [{ path, handler: name }] : [];
    });

const roleTargetingHandlers = (): string[] =>
  mutatingRoutes()
    .filter((route) => route.path.includes(':id'))
    .map((route) => route.handler);

const ROLE_ID = new Types.ObjectId().toString();
const NAME = { en: 'Content Editor', ar: 'محرّر المحتوى' };
const BODY = { name: NAME, description: null, permissionIds: [] as string[] };
const ACTOR = { userId: new Types.ObjectId().toString(), permissions: [] };

const role = (isSystemRole: boolean) =>
  ({ _id: new Types.ObjectId(ROLE_ID), name: NAME, isSystemRole, archivedAt: null, permissionIds: [] }) as never;
const SYSTEM_ROLE = role(true);
const CUSTOM_ROLE = role(false);

describe('a system role is unwritable through every roles route', () => {
  let controller: RolesController;
  const repository = {
    create: jest.fn<(data: unknown) => Promise<unknown>>(),
    findByIds: jest.fn<() => Promise<unknown[]>>(),
    findByIdIncludingArchived: jest.fn<() => Promise<unknown>>(),
    updateById: jest.fn<() => Promise<unknown>>(),
    softDelete: jest.fn<() => Promise<unknown>>(),
  };
  const assignments = { detachRole: jest.fn<() => Promise<void>>() };

  // Arguments are placed by the handler's own parameter decorators, so a route
  // added later is driven without this file knowing its signature.
  const callHandler = async (handler: string, body: object = BODY): Promise<unknown> => {
    const params: Record<string, { index: number }> =
      Reflect.getMetadata(ROUTE_ARGS_METADATA, RolesController, handler) ?? {};
    const args: unknown[] = [];
    for (const [key, { index }] of Object.entries(params)) {
      const type = Number(key.split(':')[0]);
      args[index] =
        type === RouteParamtypes.PARAM ? ROLE_ID : type === RouteParamtypes.BODY ? body : ACTOR;
    }
    const method = (controller as unknown as Record<string, (...a: unknown[]) => unknown>)[handler];
    return method.apply(controller, args);
  };

  beforeEach(() => {
    jest.resetAllMocks();
    repository.findByIds.mockResolvedValue([]);
    repository.create.mockImplementation(async (data) => data);
    repository.updateById.mockResolvedValue(CUSTOM_ROLE);
    repository.softDelete.mockResolvedValue(CUSTOM_ROLE);
    assignments.detachRole.mockResolvedValue(undefined);
    const service = new RolesService(
      repository as unknown as RolesRepository,
      { findById: jest.fn(), findByIds: jest.fn() } as unknown as PermissionsService,
      assignments as unknown as RoleAssignmentsRepository,
    );
    controller = new RolesController(service);
  });

  it.each(roleTargetingHandlers())('%s refuses a system role and writes nothing', async (handler) => {
    repository.findByIdIncludingArchived.mockResolvedValue(SYSTEM_ROLE);

    const refusal = callHandler(handler);

    await expect(refusal).rejects.toBeInstanceOf(ForbiddenException);
    await expect(refusal).rejects.toMatchObject({ response: { code: 'systemRole' } });
    expect(repository.updateById).not.toHaveBeenCalled();
    expect(repository.softDelete).not.toHaveBeenCalled();
    expect(assignments.detachRole).not.toHaveBeenCalled();
  });

  // Exact, so a new role-targeting write route fails here until this guard is
  // updated to cover it.
  it('finds exactly the role-targeting write routes the controller declares', () => {
    expect(roleTargetingHandlers().sort()).toEqual(['remove', 'rename', 'updatePermissions']);
  });

  it('still lets a live custom role through every one of them', async () => {
    repository.findByIdIncludingArchived.mockResolvedValue(CUSTOM_ROLE);

    for (const handler of roleTargetingHandlers()) {
      await expect(callHandler(handler)).resolves.toBeDefined();
    }
  });

  // A mutating route with no role id in its path escapes the per-route check
  // above, so each one must be named here and shown unable to reach a system role.
  it('has create as its only mutating route that targets no existing role', () => {
    const untargeted = mutatingRoutes()
      .filter((route) => !route.path.includes(':id'))
      .map((route) => route.handler);

    expect(untargeted).toEqual(['create']);
  });

  it('create never stores a system role, even when the body asks for one', async () => {
    await callHandler('create', { ...BODY, isSystemRole: true });

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create.mock.calls[0][0]).not.toHaveProperty('isSystemRole');
  });
});
