import { Injectable } from '@nestjs/common';
import type { GroupReportResource } from '../../../common/authz/product-group.js';

export type ReportFormat = 'view' | 'export' | 'print';

/** A group report's envelope, in the shape the real aggregation will fill.
 *  `rows` is empty rather than fabricated: the query that produces it is
 *  Batch 6a's, not this one's. */
export interface GroupReportEnvelope {
  group: GroupReportResource['group'];
  resourceType: GroupReportResource['resourceType'];
  format: ReportFormat;
  rows: readonly unknown[];
}

/**
 * The nine group reports declared in `CAPABILITY_MAP` (ADR-0103 D1).
 *
 * The aggregation itself lands in Batch 6a. This service exists so that
 * `<group>Reports:ViewReports`/`Export`/`Print` are each enforced by a real
 * route now, answering an honestly empty envelope rather than a fabricated
 * row.
 */
@Injectable()
export class ReportsService {
  envelope(resource: GroupReportResource, format: ReportFormat): GroupReportEnvelope {
    return { group: resource.group, resourceType: resource.resourceType, format, rows: [] };
  }
}
