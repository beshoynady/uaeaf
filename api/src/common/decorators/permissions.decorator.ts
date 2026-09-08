import { SetMetadata } from '@nestjs/common';
import type { PermissionResource } from '../constants/permission-resources.js';

/** Metadata key PermissionsGuard reads via Reflector — shared between the
 *  @RequirePermission() decorator that sets it and the guard that reads it. */
export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

/** A permission requirement, matched against `permissions.resourceType`/`permissions.action`
 *  on the live FigJam Physical Model (table `103:7901`).
 *
 *  `resourceType` is the `PermissionResource` union, not a bare `string`
 *  (2026-09-07): the two ends of RBAC — the row stored in `permissions` and
 *  the decorator that reads it — previously shared no type, so a typo on
 *  either side produced a permission that saved fine and matched nothing.
 *  Now a mistyped resource fails to compile here and is rejected with a 400
 *  at `POST /permissions`. */
export interface RequiredPermission {
  resourceType: PermissionResource;
  action:
    | 'Create'
    | 'Read'
    | 'Update'
    | 'Delete'
    | 'HardDelete'
    | 'Approve'
    | 'Publish'
    | 'EditProtectedData'
    | 'Export';
}

/** Declares the (resourceType, action) pair PermissionsGuard checks for this route. */
export const RequirePermission = (resourceType: PermissionResource, action: RequiredPermission['action']) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, { resourceType, action } satisfies RequiredPermission);
