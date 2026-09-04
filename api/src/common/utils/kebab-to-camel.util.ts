/**
 * Converts a kebab-case route segment (e.g. `athlete-profiles`, as every
 * multi-word `@Controller()` path in this codebase is named) to the
 * camelCase Mongoose collection name the same entity is stored/referenced
 * under everywhere else (`athleteProfiles` — the `entityType` value
 * `workflowInstances`/`revisions`/`publications`/`workflowPolicies` use).
 *
 * Verified against all 62 controller route segments in this codebase: the
 * project's own naming convention is that a controller's kebab-case path
 * is always the kebab-case form of its collection's camelCase name, so this
 * mechanical transform requires no hardcoded per-collection map and needs
 * no maintenance as new modules are added (schema-audit-2026-09-04.md
 * §3.2/§9.4 — closes the `auditLogs.entityType` vs. workflow-subsystem
 * `entityType` casing mismatch).
 */
export function kebabToCamel(segment: string): string {
  return segment.replace(/-([a-z0-9])/g, (_match, char: string) => char.toUpperCase());
}
