import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsInt, IsMongoId, IsOptional, Min, ValidateIf } from 'class-validator';
import { APPROVAL_MODES } from '../../../../bootstrap/seed-news-approval.js';
import type { ApprovalMode } from '../../../../bootstrap/seed-news-approval.js';

/**
 * Request body for `PUT /workflow-policies/:entityType/approval`.
 *
 * One body configures the whole arrangement — whether a review is required at
 * all, who decides, and how their decisions combine — because those three are
 * one decision an administrator makes in one sitting. Split across three
 * endpoints, a half-applied change leaves a policy demanding approval from a
 * definition with nobody on it, which stops every publication of that type
 * with no way for the administrator to see why.
 */
export class ConfigureApprovalDto {
  @ApiProperty({
    description:
      'Whether this entity type needs a review before publication. False leaves the definition and ' +
      'its steps in place — turning approvals back on later restores the same approvers.',
  })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    enum: APPROVAL_MODES,
    description:
      'ALL — every approver must approve. THRESHOLD — the chosen number of them. SEQUENTIAL — each ' +
      'in the order listed. Required when enabling.',
  })
  @ValidateIf((dto: ConfigureApprovalDto) => dto.enabled)
  @IsIn(APPROVAL_MODES)
  mode?: ApprovalMode;

  @ApiPropertyOptional({
    type: [String],
    description: 'The users who decide, in order — the order matters for SEQUENTIAL. Required when enabling.',
  })
  @ValidateIf((dto: ConfigureApprovalDto) => dto.enabled)
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  approverIds?: string[];

  @ApiPropertyOptional({
    description: 'How many approvals are needed, for THRESHOLD only. Defaults to 1.',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  threshold?: number;
}
