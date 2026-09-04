import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';
import { MediaFileDto } from './media-file.dto.js';

/** Request body for POST /media-assets. */
export class CreateMediaAssetDto {
  @ApiProperty({ description: 'Album this asset belongs to, if any.', required: false })
  @IsOptional()
  @IsMongoId()
  albumId?: string;

  @ApiProperty({ type: MediaFileDto })
  @ValidateNested()
  @Type(() => MediaFileDto)
  file: MediaFileDto;

  @ApiProperty({ description: 'Bilingual caption.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  caption: LocalizedTextDto;

  @ApiProperty({ description: 'Bilingual accessibility alt text.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  altText: LocalizedTextDto;

  @ApiProperty({ description: 'Manual sort position within the parent album.' })
  @IsInt()
  displayOrder: number;

  @ApiProperty({ default: true, required: false })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
