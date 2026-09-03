import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

/** Request body for "end current relationship" actions (e.g. a club-history
 *  release or contract expiry with no replacement row) — an optional
 *  explicit end date, defaulting to now when omitted. Shared across every
 *  History collection that enforces "at most one `endDate: null` row per
 *  person" (confirmed 2026-09-02). */
export class EndCurrentDto {
  @ApiPropertyOptional({ description: 'Defaults to now if omitted.' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
