import { ApiProperty } from '@nestjs/swagger';
import type { AuditAction } from '../schemas/audit-log.schema.js';

/**
 * What a reader of the audit trail is allowed to see.
 *
 * An explicit allowlist, for the same reason `UserResponseDto` is one: the
 * stored row carries `previousValue` and `newValue`, which are snapshots of
 * whole documents. Those are already redacted on the way in (see
 * `AuditLogInterceptor`), but the boundary is stated here too — a change to
 * what the interceptor stores must not silently widen what this returns.
 */
export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'The user who performed the action.' })
  actorId: string;

  @ApiProperty({ enum: ['Create', 'Update', 'Delete', 'HardDelete', 'StatusChange', 'AccessDenied'] })
  action: AuditAction;

  @ApiProperty({ description: 'Collection the action concerned, in camelCase.' })
  entityType: string;

  @ApiProperty({
    description: 'The specific record, or null for a collection-level action such as a denied list request.',
    nullable: true,
  })
  entityId: string | null;

  @ApiProperty()
  timestamp: Date;

  @ApiProperty({
    description: 'The record as it was before the change. Null for creations and for rows written before this was captured.',
    nullable: true,
  })
  previousValue: Record<string, unknown> | null;

  @ApiProperty({ description: 'The record as it was after the change.', nullable: true })
  newValue: Record<string, unknown> | null;

  @ApiProperty({ nullable: true })
  reason: string | null;

  @ApiProperty()
  ipAddress: string;

  @ApiProperty()
  userAgent: string;
}

/** A page of the trail. Read-only and append-only, so a cursor is
 *  unnecessary — the newest rows are the ones anyone asks for. */
export class AuditLogPageDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  items: AuditLogResponseDto[];

  @ApiProperty({ description: 'Total rows matching the filter, before paging.' })
  total: number;
}
