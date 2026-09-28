import type { RequiredPermission } from '../../../common/decorators/permissions.decorator.js';
import type { PermissionAction } from '../permissions/schemas/permission.schema.js';

/** The class that sets session-warning timing and trusted-device life. See spec §7.2. */
export type AccountClass = 'standard' | 'sensitive' | 'superAdmin';

// Each changes who holds authority, exposes or extracts protected data (the audit
// log holds security events and actor details), or destroys irreversibly. See ADR-0108 D1.
const SENSITIVE_ACTIONS: readonly PermissionAction[] = [
  'ManageRoles',
  'AssignRoles',
  'ViewSensitive',
  'Export',
  'PermanentDelete',
  'ViewAuditLog',
];

/** Classifies an account from its resolved set, so the class follows a role edit at once. */
export const accountClassFor = (
  permissions: readonly RequiredPermission[],
  holdsSystemRole: boolean,
): AccountClass =>
  holdsSystemRole
    ? 'superAdmin'
    : permissions.some((pair) => SENSITIVE_ACTIONS.includes(pair.action))
      ? 'sensitive'
      : 'standard';
