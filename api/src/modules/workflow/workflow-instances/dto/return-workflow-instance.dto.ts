import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString, MinLength } from 'class-validator';

/** Request body for POST /workflow-instances/:id/return. */
export class ReturnWorkflowInstanceDto {
  @ApiProperty({ description: 'The earlier step to send this instance back to.' })
  @IsMongoId()
  returnedToStepId: string;

  @ApiProperty({ description: 'What needs to change before resubmission.' })
  @IsString()
  @MinLength(1)
  reason: string;
}
