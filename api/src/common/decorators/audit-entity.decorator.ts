import { SetMetadata } from '@nestjs/common';
import type { AuditAction } from '../../modules/workflow/audit-logs/schemas/audit-log.schema.js';

/** Metadata key `AuditLogInterceptor` reads via Reflector. */
export const AUDIT_ENTITY_KEY = 'auditEntity';

/**
 * What a route audits, when the interceptor cannot work it out on its own.
 *
 * `type` overrides the entity type the interceptor would otherwise derive from
 * the URL's first segment. `idFrom` names the route parameter that identifies
 * the subject when it is not `:id` — recorded in the row's `reason` when it is
 * not an ObjectId, because a policy keyed by `entityType` has a real identity
 * that simply is not an id.
 *
 * `action` overrides `auditActionFor`'s own derivation outright — added
 * 2026-09-27 (independent review, round 4) for the genuine special case
 * `auditActionFor`'s own doc comment said would earn it: a route guarded by a
 * permission verb that cannot express what the route does at ALL, generically,
 * for every route that verb might ever guard. `roles:ManageRoles` is the
 * first: it covers renaming a role, editing its permissions, AND archiving
 * it, so no reading of that one verb — however `auditActionFor` evolves —
 * could derive the right value for `DELETE /roles/:id` specifically without
 * also being wrong for `PATCH /roles/:id/name`. Kept separate from `type`: a
 * route naming its own action override is not thereby also naming a
 * non-standard entity type, and vice versa. Declared once, per route, the
 * same place `type`/`idFrom` already live for the same reason — not a
 * second, competing way to guess the value `auditActionFor` already computes
 * for the ordinary case.
 */
export interface AuditEntityOptions {
  type?: string;
  idFrom?: string;
  action?: AuditAction;
}

/**
 * Declares the audited subject for a route whose path key is not `:id` and
 * whose response carries no id.
 *
 * Without it such a route used to write nothing at all (ADR-0112). It is
 * deliberately not required on every mutating route: most carry `:id`, and a
 * decorator that is almost always redundant is one people stop reading.
 */
export const AuditEntity = (options: AuditEntityOptions) => SetMetadata(AUDIT_ENTITY_KEY, options);
