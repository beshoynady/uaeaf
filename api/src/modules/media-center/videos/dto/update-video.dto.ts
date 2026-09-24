import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsIn, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { VIDEO_CATEGORIES, VIDEO_KINDS, VIDEO_STATUSES } from '../schemas/video.schema.js';
import type { VideoCategory, VideoKind, VideoStatus } from '../schemas/video.schema.js';

/**
 * Request body for PATCH /videos/:id — every field optional, because an
 * editor saving a title should not have to resend the platform.
 *
 * The link itself (`externalUrl`, `externalPlatform`, `externalId`) is not
 * editable: those three are one fact, resolved together from a pasted URL, and
 * changing one of them in isolation produces a row whose embed points
 * somewhere its title does not describe. Replacing a video's link means
 * adding the new one and archiving the old.
 *
 * `publishedAt` is accepted only so a back-dated import can state its real
 * date. Left out — which is the normal case — the service decides it from the
 * status transition.
 */
export class UpdateVideoDto {
  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiProperty({ enum: VIDEO_CATEGORIES, required: false })
  @IsOptional()
  @IsIn(VIDEO_CATEGORIES)
  category?: VideoCategory;

  @ApiProperty({ enum: VIDEO_KINDS, required: false })
  @IsOptional()
  @IsIn(VIDEO_KINDS)
  kind?: VideoKind;

  @ApiProperty({ enum: VIDEO_STATUSES, required: false })
  @IsOptional()
  @IsIn(VIDEO_STATUSES)
  status?: VideoStatus;

  @ApiProperty({ required: false, description: 'Back-dated imports only; normally decided by the transition.' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  publishedAt?: Date | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsMongoId()
  thumbnailId?: string | null;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
