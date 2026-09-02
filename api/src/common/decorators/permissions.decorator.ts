import { SetMetadata } from '@nestjs/common';

/** Metadata key PermissionsGuard reads via Reflector — shared between the
 *  @RequirePermission() decorator that sets it and the guard that reads it. */
export const REQUIRED_PERMISSION_KEY = 'requiredPermission';

/** A permission requirement, matched against `permissions.resourceType`/`permissions.action`
 *  on the live FigJam Physical Model (table `103:7901`). */
export interface RequiredPermission {
  resourceType: string;
  action: 'Create' | 'Read' | 'Update' | 'Delete' | 'HardDelete' | 'Approve' | 'Publish' | 'EditProtectedData';
}

/** Declares the (resourceType, action) pair PermissionsGuard checks for this route. */
export const RequirePermission = (resourceType: string, action: RequiredPermission['action']) =>
  SetMetadata(REQUIRED_PERMISSION_KEY, { resourceType, action } satisfies RequiredPermission);
