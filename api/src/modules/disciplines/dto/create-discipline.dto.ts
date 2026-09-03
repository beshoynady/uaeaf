import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

/** Request body for POST /disciplines. */
export class CreateDisciplineDto {
  @ApiProperty({ description: 'Bilingual discipline name, e.g. { en: "Jumps", ar: "القفز" }.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Unique slug for the category detail page.' })
  @IsString()
  @MinLength(1)
  slug: string;

  @ApiProperty({ description: 'Hero background image for the category detail page.', required: false })
  @IsOptional()
  @IsMongoId()
  coverImage?: string;

  @ApiProperty({ description: 'Bilingual educational overview text.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto;

  @ApiProperty({ description: 'Drives the "internationally certified" badge on the category page.' })
  @IsBoolean()
  isInternationallyCertified: boolean;

  @ApiProperty({ description: 'Client-resolved icon token.' })
  @IsString()
  @MinLength(1)
  iconKey: string;
}
