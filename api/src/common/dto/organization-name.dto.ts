import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * An organisation's name, either side optional (ADR-0085 D4). That at least
 * one side is present, and how long each may be, is checked by
 * `normalizeOrganizationName`, because a refusal there names the field the
 * dashboard shows it beside.
 */
export class OrganizationNameDto {
  @ApiPropertyOptional({ description: 'Arabic name, as the organisation writes it.', nullable: true })
  @IsOptional()
  @IsString()
  ar?: string | null;

  @ApiPropertyOptional({ description: 'English name, as the organisation writes it.', nullable: true })
  @IsOptional()
  @IsString()
  en?: string | null;
}
