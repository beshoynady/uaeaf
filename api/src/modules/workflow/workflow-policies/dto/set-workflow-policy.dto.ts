import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsMongoId, IsOptional } from 'class-validator';

/**
 * Request body for `PUT /workflow-policies/:entityType/:operation`.
 *
 * The pair is in the path because it identifies the policy — there is at
 * most one per (entityType, operation), enforced by a unique index
 * (ADR-0069 D4). Carrying it in the body as well would let a caller address
 * one policy and describe another.
 */
export class SetWorkflowPolicyDto {
  @ApiProperty({
    description:
      'Whether this operation must go through an approval workflow. When true, workflowDefinitionId ' +
      'must name an active definition for the same entityType, or the operation resolves to blocked.',
  })
  @IsBoolean()
  workflowRequired: boolean;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'The definition that governs this operation. Required in practice when workflowRequired is true.',
  })
  @IsOptional()
  @IsMongoId()
  workflowDefinitionId?: string | null;

  @ApiProperty({
    required: false,
    description: 'Whether "delete" may mean physical deletion for this entity type. Defaults to false.',
  })
  @IsOptional()
  @IsBoolean()
  allowHardDelete?: boolean;
}
