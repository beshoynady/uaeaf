import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto.js';

/**
 * Request-body base for the ten hero-wrapper listing pages — mirrors
 * `HeroPageSchema`. Concrete page DTOs extend this and add their own
 * fields; `class-validator` walks the prototype chain, so inherited
 * decorators still apply.
 */
export class HeroPageDto {
  @ApiProperty({ required: false, description: 'ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  heroImageId?: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  heroTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  heroSubtitle: LocalizedTextDto;
}
