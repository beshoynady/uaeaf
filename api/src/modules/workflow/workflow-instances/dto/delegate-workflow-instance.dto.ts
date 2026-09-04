import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString } from 'class-validator';

/** Request body for POST /workflow-instances/:id/delegate. */
export class DelegateWorkflowInstanceDto {
  @ApiProperty({ description: 'The user this step is being delegated to.' })
  @IsMongoId()
  delegatedToUserId: string;

  @ApiProperty({ description: 'Optional delegation note.', required: false })
  @IsOptional()
  @IsString()
  reason?: string;
}
