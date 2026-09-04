import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsIn, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ContentAssociationDto } from '../../albums/dto/content-association.dto.js';
import { VIDEO_EXTERNAL_PLATFORMS } from '../schemas/video.schema.js';
import type { VideoExternalPlatform } from '../schemas/video.schema.js';

/** Request body for POST /videos. */
export class CreateVideoDto {
  @ApiProperty({ description: 'Bilingual video title.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty()
  @IsMongoId()
  contentCategoryId: string;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isLive?: boolean;

  @ApiProperty({ enum: VIDEO_EXTERNAL_PLATFORMS })
  @IsIn(VIDEO_EXTERNAL_PLATFORMS)
  externalPlatform: VideoExternalPlatform;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  externalUrl: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  thumbnailId?: string;

  @ApiProperty({ type: [ContentAssociationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentAssociationDto)
  associations?: ContentAssociationDto[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
