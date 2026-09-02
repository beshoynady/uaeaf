import type { Types } from 'mongoose';
import type { AuditAction } from '../schemas/audit-log.schema.js';

/** Internal shape AuditLogInterceptor passes to AuditLogsService.write() —
 *  not an HTTP-facing DTO, there is no public endpoint for this yet. */
export interface WriteAuditLogInput {
  actorId: Types.ObjectId;
  action: AuditAction;
  entityType: string;
  entityId: Types.ObjectId | null;
  ipAddress: string;
  userAgent: string;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  reason?: string | null;
}
