import { CAPABILITY_MAP } from './capability-map.js';
import type { ProductGroup } from './capability-map.js';
import type { PermissionResource } from '../constants/permission-resources.js';

export type { ProductGroup };

/**
 * One group report pseudo-resource: the product group it stands for, the
 * `*Reports` resourceType `@RequirePermission` guards, and the literal route
 * segment `ReportsController` mounts it under.
 *
 * Derived from `CAPABILITY_MAP` rather than listed again by hand, so the nine
 * `*Reports` resources declared there (ADR-0103 D1) and the routes that guard
 * them cannot drift apart. Users & Access has no entry here: none of its
 * resourceTypes end in `Reports`, since Q-A excludes it from reports
 * entirely.
 */
export interface GroupReportResource {
  group: ProductGroup;
  resourceType: PermissionResource;
  /** `resourceType` with the `Reports` suffix removed. */
  param: string;
}

export const GROUP_REPORT_RESOURCES: readonly GroupReportResource[] = CAPABILITY_MAP.filter((entry) =>
  entry.resourceType.endsWith('Reports'),
).map((entry) => ({
  group: entry.group,
  resourceType: entry.resourceType,
  param: entry.resourceType.slice(0, -'Reports'.length),
}));
