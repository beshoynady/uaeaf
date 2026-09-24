import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ContentAssociationDto } from '../../albums/dto/content-association.dto.js';
import { VIDEO_CATEGORIES, VIDEO_EXTERNAL_PLATFORMS, VIDEO_KINDS } from '../schemas/video.schema.js';
import type { VideoCategory, VideoExternalPlatform, VideoKind } from '../schemas/video.schema.js';

/**
 * Request body for POST /videos.
 *
 * `status` and `publishedAt` are absent on purpose: a video is always created
 * as a draft, and its publication date is stamped by the service at the
 * transition. Accepting either here would let a caller publish something
 * without the transition ever happening.
 */
export class CreateVideoDto {
  @ApiProperty({ description: 'Bilingual video title.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ enum: VIDEO_CATEGORIES })
  @IsIn(VIDEO_CATEGORIES)
  category: VideoCategory;

  @ApiProperty({ enum: VIDEO_KINDS, required: false, default: 'video' })
  @IsOptional()
  @IsIn(VIDEO_KINDS)
  kind?: VideoKind;

  @ApiProperty({ enum: VIDEO_EXTERNAL_PLATFORMS })
  @IsIn(VIDEO_EXTERNAL_PLATFORMS)
  externalPlatform: VideoExternalPlatform;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  externalUrl: string;

  @ApiProperty({ description: "The video's id on its own platform." })
  @IsString()
  @MinLength(1)
  externalId: string;

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
