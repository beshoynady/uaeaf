import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { LocalizedRichTextDto } from '../../../../common/dto/localized-rich-text.dto.js';
import { IconKeyedContentBlockDto } from '../../../../common/dto/content-block.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';

/**
 * Request body for `PATCH /president-message-page/:id` — the editable
 * surface of the message, and deliberately not `PartialType(Create…)`.
 *
 * Two fields the create body carries are absent here on purpose:
 *
 * - `federationAppointmentId` is the row's canonical identity. Re-pointing
 *   an existing message at a different presidential term would reattribute
 *   a signed statement to someone who did not make it; a message for
 *   another term is a new row.
 * - `publicationState` is denormalized from `publications` (ADR-0020). It
 *   is a consequence of publishing, never an instruction from a client —
 *   accepting it here would let an editor mark a draft "Published" without
 *   anything having been published.
 *
 * Every field is optional and applied only when its key is present, so a
 * partial save touches nothing it did not name. `null` is a value: sending
 * `pullQuote: null` clears it, while omitting the key leaves it alone.
 */
export class UpdatePresidentMessagePageDto {
  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  heroImageId?: string | null;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  heroTitle?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  heroSubtitle?: LocalizedTextDto;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  @IsOptional()
  @IsMongoId()
  featuredImageId?: string | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  pullQuote?: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedRichTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedRichTextDto)
  messageBody?: LocalizedRichTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  valuesTitle?: LocalizedTextDto | null;

  @ApiProperty({ type: [IconKeyedContentBlockDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IconKeyedContentBlockDto)
  values?: IconKeyedContentBlockDto[];

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  signatoryName?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  signatoryTitle?: LocalizedTextDto;

  @ApiProperty({ type: PageSeoDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto | null;
}
