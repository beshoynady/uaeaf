import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

/** `formationDecision` on the create/update committee body: the board
 *  decision that formed the committee. */
export class FormationDecisionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  number: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ nullable: true, description: 'ref → documents.' })
  @IsOptional()
  @IsMongoId()
  documentId?: string | null;
}
