import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';
import { AUDIT_ACTIONS } from '../schemas/audit-log.schema.js';
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
