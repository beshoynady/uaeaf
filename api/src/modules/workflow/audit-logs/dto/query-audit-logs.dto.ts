import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { AUDIT_ACTIONS, SECURITY_AUDIT_ACTIONS } from '../schemas/audit-log.schema.js';
import type { AuditAction } from '../schemas/audit-log.schema.js';

/**
 * Query for GET /audit-logs.
 *
 * The filters are exactly the two access patterns the collection was
 * designed around (`06-Database-Architecture.md` §11): the history of one
 * record, and what one actor did. `action` is there because "show me the
 * denials" is the third question anyone actually asks of an audit trail.
 */
export class QueryAuditLogsDto {
  @ApiPropertyOptional({ description: 'Collection name, camelCase — e.g. `roles`, `users`.' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'History of one specific record.' })
  @IsOptional()
  @IsMongoId()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Everything one user did.' })
  @IsOptional()
  @IsMongoId()
  actorId?: string;

  @ApiPropertyOptional({ enum: AUDIT_ACTIONS })
  @IsOptional()
  @IsIn(AUDIT_ACTIONS)
  action?: AuditAction;

  /** Security-relevant rows only — `SECURITY_AUDIT_ACTIONS`, derived from
   *  one named list rather than repeated here, so a fifth security action
   *  cannot be added to the vocabulary without this filter changing too.
   *  Takes precedence over `action` when both are sent — asking for the
   *  security view and one specific ordinary action at once is not a
   *  request this endpoint tries to reconcile.
   *
   *  The Swagger description is built from `SECURITY_AUDIT_ACTIONS` itself
   *  (independent review, round 4, M7) rather than hand-listed: the
   *  hand-listed version already went stale once, still naming three kinds
   *  the round `PermanentDelete` joined the set in the same task. */
  @ApiPropertyOptional({ description: `${SECURITY_AUDIT_ACTIONS.join(', ')} only.` })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  securityEventsOnly?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  /** Capped at 100. The trail grows without bound and nothing about it is
   *  worth streaming in one response. */
  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
