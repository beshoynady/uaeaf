import type { PermissionAction } from '../../modules/platform-administration/permissions/schemas/permission.schema.js';
import type { PermissionResource } from './permission-resources.js';
import { CAPABILITY_MAP } from '../authz/capability-map.js';

/**
 * Every (resourceType, action) pair the platform recognises — one row per pair,
 * which is the shape the `permissions` collection is seeded in.
 *
 * DERIVED from `CAPABILITY_MAP` rather than maintained beside it (ADR-0103).
 * The two lists were kept by hand until 2026-09-27 and had drifted in the way
 * two hand-kept lists always do: nothing declared what a resource *should* be
 * able to do, so thirty resources carried `Create` and `Archive` with no
 * `Update`, and four workflow-governed types could be approved and never
 * published. The map now carries that declaration and this file is one
 * `flatMap` over it, so there is no second place for the answer to live.
 *
 * The exported shape is unchanged, so nothing downstream moved: `seed-admin`
 * and `sync-permission-catalogue` still seed from this, and
 * `permission-catalogue.spec.ts` still compares it against the
 * `@RequirePermission` decorators in both directions — a guarded route with no
 * pair here, and a pair here that guards no route, both fail.
 */
export interface PermissionCatalogueEntry {
  resourceType: PermissionResource;
  action: PermissionAction;
}

export const PERMISSION_CATALOGUE: readonly PermissionCatalogueEntry[] = CAPABILITY_MAP.flatMap(
  (capability) => capability.actions.map((action) => ({ resourceType: capability.resourceType, action })),
);
