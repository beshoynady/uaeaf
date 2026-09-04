import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

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
}
