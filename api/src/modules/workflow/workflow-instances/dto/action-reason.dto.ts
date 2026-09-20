import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

/** Request body for POST /workflow-instances/:id/approve. */
export class ApproveWorkflowInstanceDto {
  @ApiProperty({ description: 'Optional approval note.', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}

/** Request body for POST /workflow-instances/:id/reject. */
export class RejectWorkflowInstanceDto {
  @ApiProperty({ description: 'Why this submission was rejected.' })
  @IsString()
  @MinLength(1)
  reason: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'True when the reviewer is asking for changes rather than refusing the item outright. The ' +
      'engine treats the two identically — the record returns to draft, and resubmitting restarts ' +
      'the review from its first step — so this records which of them the reviewer meant.',
  })
  @IsOptional()
  @IsBoolean()
  revisionRequested?: boolean;
}
