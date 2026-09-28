import type { AuditAction } from './schemas/audit-log.schema.js';

const METHOD_TO_ACTION: Partial<Record<string, AuditAction>> = {
  POST: 'Create',
  PATCH: 'Update',
  PUT: 'Update',
  DELETE: 'Delete',
};

/**
 * Permission verbs the audit vocabulary tells apart from the generic
 * HTTP-method mapping (owner decision 2026-09-27, docs/design-system/
 * ADR-0103-Capability-Map-And-Action-Vocabulary.md). Before this, every
 * `@Delete()` route logged `Delete` regardless of what it actually did: the
 * 48 routes the Delete→Archive rename left reversible logged the same value
 * as the one route that is not (`DELETE /media-assets/:id/object`), and
 * `@Post(':id/restore')` logged `Create` — a restore reading as a brand-new
 * record.
 */
const OVERRIDE_ACTIONS: ReadonlySet<AuditAction> = new Set(['Archive', 'Restore', 'PermanentDelete']);

/**
 * The audit action a CRUD-shaped write logs under — the single function
 * (owner decision 2026-09-27, round 3) every writer of an `auditLogs` row
 * calls to decide it, rather than typing the value in.
 *
 * Derived from the caller's own permission action when that action is one of
 * the three the vocabulary tells apart — not because each write declares its
 * audit value, but because it already knows its permission, and a new
 * archive route (or a self-auditing service call that knows its own route's
 * permission) logs `Archive` for free, with nothing else to remember. Every
 * other case keeps the plain HTTP-method mapping, unchanged.
 *
 * NOT for every audit write. `StatusChange` (workflow submissions, approvals,
 * publications — `PublishingService`, `WorkflowInstancesService`,
 * `ApprovalConfigurationService`), `AccessDenied` (`PermissionsGuard`) and
 * `SuperAdminGranted`/`SuperAdminRevoked` (`UsersService`) are not
 * permission-verb derivations at all: none of them corresponds to a
 * `PermissionAction`, so there is nothing here for this function to derive
 * them FROM. Those stay hand-typed, deliberately, and are named exceptions
 * in `audit-action-literal-scan.spec.ts` rather than silently exempted.
 *
 * Both `AuditLogInterceptor` (reading the route's `@RequirePermission`
 * metadata) and any self-auditing service that knows its own route's
 * (method, permission action) pair — `ArticlesService` today — call this
 * rather than deciding independently, which is exactly the kind of second
 * decision that drifted from the first (`articles.service.ts` logged
 * `Delete` for an archive route for as long as the generic mapping did,
 * and then kept doing it after the generic mapping was fixed, because
 * nothing forced the two to agree).
 *
 * Lives in `audit-logs`, not `common/`, so it can be imported by ordinary
 * feature services (`ArticlesService` already depends on `AuditLogsService`
 * from this same module) without reaching from a service into an
 * interceptor file, and by `AuditLogInterceptor` itself — which already
 * imports several things from this module — with no new dependency
 * direction either way.
 *
 * The method is resolved FIRST, and the override applies only on top of a
 * method the interceptor would have audited anyway (independent review,
 * round 4). Reading `permissionAction` before the method let a **GET**
 * route guarded by one of the three override verbs — exactly what
 * `GET /media-assets/unused` (Task 10) is specified to be, behind
 * `mediaAssets:PermanentDelete` — answer `PermanentDelete`, so opening the
 * report would write an audit row claiming a permanent deletion happened.
 * A non-mutating method now returns `undefined` whatever the permission
 * verb says, matching `AuditLogInterceptor`'s own existing behaviour for a
 * method it does not audit.
 */
export const auditActionFor = (
  method: string,
  permissionAction?: string,
): AuditAction | undefined => {
  const byMethod = METHOD_TO_ACTION[method];
  if (!byMethod) {
    return undefined;
  }
  if (permissionAction && OVERRIDE_ACTIONS.has(permissionAction as AuditAction)) {
    return permissionAction as AuditAction;
  }
  return byMethod;
};
