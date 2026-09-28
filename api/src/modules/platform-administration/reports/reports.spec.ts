import 'reflect-metadata';
import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from '../../../common/guards/permissions.guard.js';
import { REQUIRED_PERMISSION_KEY } from '../../../common/decorators/permissions.decorator.js';
import type { AuthenticatedUser } from '../../../common/interfaces/jwt-payload.interface.js';
import type { AuditLogsService } from '../../workflow/audit-logs/audit-logs.service.js';
import { CAPABILITY_MAP, capabilityFor } from '../../../common/authz/capability-map.js';
import { GROUP_REPORT_RESOURCES } from '../../../common/authz/product-group.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

describe('group report resources', () => {
  // Nine, not ten: Q-A excludes Users & Access from ViewReports entirely, so
  // the Platform Administration group has no report resource — which is also
  // what keeps `users:Export` a per-resource pair rather than a group one.
  it('declares one pseudo-resource per reportable product group', () => {
    expect(GROUP_REPORT_RESOURCES).toHaveLength(9);
  });

  it('has no report resource for Platform Administration', () => {
    expect(GROUP_REPORT_RESOURCES.map((entry) => entry.group)).not.toContain('platform-administration');
  });

  it('covers every group except the one deliberately excluded', () => {
    const groups = new Set(CAPABILITY_MAP.map((entry) => entry.group));
    const covered = new Set(GROUP_REPORT_RESOURCES.map((entry) => entry.group));
    const missing = [...groups].filter((group) => !covered.has(group));

    expect(missing).toEqual(['platform-administration']);
  });

  it('gives a group resource exactly ViewReports, Export and Print', () => {
    for (const resource of GROUP_REPORT_RESOURCES) {
      expect(capabilityFor(resource.resourceType)?.actions).toEqual(['ViewReports', 'Export', 'Print']);
    }
  });
});

/** `param`, capitalized, is exactly how `ReportsController` names its three
 *  methods per group (`viewGovernance`, `exportGovernance`, `printGovernance`,
 *  …) — asserted here rather than assumed, so a renamed method fails loudly
 *  instead of silently dropping out of this suite. */
const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

describe('ReportsController', () => {
  const service = new ReportsService();
  const controller = new ReportsController(service);
  const auditLogsService = { write: jest.fn() } as unknown as AuditLogsService;
  const guard = new PermissionsGuard(new Reflector(), auditLogsService);

  const makeContext = (user: AuthenticatedUser, handler: () => unknown) =>
    ({
      getHandler: () => handler,
      getClass: () => ReportsController,
      switchToHttp: () => ({
        getRequest: () => ({ user, params: {}, method: 'GET', url: '/reports', headers: {} }),
      }),
    }) as never;

  describe.each(GROUP_REPORT_RESOURCES)('$resourceType', ({ group, resourceType, param }) => {
    const methodName = capitalize(param);
    // Not `.bind()`: a bound function is a distinct object that does not carry
    // the metadata `SetMetadata` attached to the original, so the guard (and
    // this suite's own metadata assertion) would read `undefined` off it.
    const view = (controller as unknown as Record<string, () => unknown>)[`view${methodName}`];
    const doExport = (controller as unknown as Record<string, () => unknown>)[`export${methodName}`];
    const print = (controller as unknown as Record<string, () => unknown>)[`print${methodName}`];

    it('declares the group pair on each of its three routes', () => {
      expect(Reflect.getMetadata(REQUIRED_PERMISSION_KEY, view)).toEqual({ resourceType, action: 'ViewReports' });
      expect(Reflect.getMetadata(REQUIRED_PERMISSION_KEY, doExport)).toEqual({ resourceType, action: 'Export' });
      expect(Reflect.getMetadata(REQUIRED_PERMISSION_KEY, print)).toEqual({ resourceType, action: 'Print' });
    });

    it('refuses a caller with no ViewReports for this group', async () => {
      const nonHolder: AuthenticatedUser = { userId: '507f1f77bcf86cd799439011', roleIds: [], permissions: [] };

      await expect(guard.canActivate(makeContext(nonHolder, view))).rejects.toThrow(ForbiddenException);
    });

    it('admits a caller holding this group\'s ViewReports', async () => {
      const holder: AuthenticatedUser = {
        userId: '507f1f77bcf86cd799439012',
        roleIds: [],
        permissions: [{ resourceType, action: 'ViewReports' }],
      };

      await expect(guard.canActivate(makeContext(holder, view))).resolves.toBe(true);
    });

    it('does not let this group\'s ViewReports pass the export route', async () => {
      const viewOnlyHolder: AuthenticatedUser = {
        userId: '507f1f77bcf86cd799439013',
        roleIds: [],
        permissions: [{ resourceType, action: 'ViewReports' }],
      };

      await expect(guard.canActivate(makeContext(viewOnlyHolder, doExport))).rejects.toThrow(ForbiddenException);
    });

    it('answers the honest empty envelope rather than a fabricated row', () => {
      expect(view.call(controller)).toEqual({ group, resourceType, format: 'view', rows: [] });
      expect(doExport.call(controller)).toEqual({ group, resourceType, format: 'export', rows: [] });
      expect(print.call(controller)).toEqual({ group, resourceType, format: 'print', rows: [] });
    });
  });
});
