import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { HERO_SLIDE_MEDIA_TYPES } from '../schemas/hero-slides.schema.js';
import type { HeroSlideMediaType } from '../schemas/hero-slides.schema.js';

/** Public-safe `HeroSlide` shape — a distinct response class (never the raw
 *  document), matching the "never return raw from a public path" discipline
 *  used across every other public DTO. `active`/`scheduledFrom`/
 *  `scheduledTo` are the server-side visibility gate, not display data, so
 *  they're excluded here the same way `pageSections`'s window fields never
 *  reach a public reader. */
export class HeroSlidePublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: HERO_SLIDE_MEDIA_TYPES }) mediaType: HeroSlideMediaType;
  @ApiProperty({ required: false, nullable: true }) imageAssetId: string | null;
  @ApiProperty({ required: false, nullable: true }) videoId: string | null;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) subtitle: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) ctaText: LocalizedTextDto;
  @ApiProperty() ctaUrl: string;
  @ApiProperty() displayOrder: number;
}
