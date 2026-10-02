import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** One entry of a `PersonnelCvDto` list. */
export class CvEntryDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  text: LocalizedTextDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiProperty()
  @IsInt()
  order: number;
}

/** `cv` request shape — five independently ordered lists, each optional. */
export class PersonnelCvDto {
  @ApiPropertyOptional({ type: [CvEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEntryDto)
  qualifications?: CvEntryDto[];

  @ApiPropertyOptional({ type: [CvEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEntryDto)
  certifications?: CvEntryDto[];

  @ApiPropertyOptional({ type: [CvEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEntryDto)
  previousPositions?: CvEntryDto[];

  @ApiPropertyOptional({ type: [CvEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEntryDto)
  experience?: CvEntryDto[];

  @ApiPropertyOptional({ type: [CvEntryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CvEntryDto)
  achievements?: CvEntryDto[];
}
