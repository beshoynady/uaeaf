import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

/** Request body for POST /workflow-instances/:id/resubmit — only valid
 *  while the instance is Rejected or Returned. */
export class ResubmitWorkflowInstanceDto {
  @ApiProperty({ description: 'The new revision (author\'s updated content) to resubmit.' })
  @IsMongoId()
  revisionId: string;
}
