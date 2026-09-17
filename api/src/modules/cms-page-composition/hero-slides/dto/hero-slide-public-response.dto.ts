import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PublicImageDto } from '../../../../common/dto/public-page.dto.js';
import { FocalPointDto } from './hero-slide-parts.dto.js';
import { HERO_SLIDE_MEDIA_TYPES } from '../schemas/hero-slides.schema.js';
import type { HeroSlideMediaType } from '../schemas/hero-slides.schema.js';

/** A button, as a visitor receives it. Only visible buttons are sent at all,
 *  so this shape has no `isVisible`: the presence of the object *is* the
 *  visibility, and a hidden button's words never leave the server. */
export class HeroCtaPublicResponseDto {
  @ApiProperty({ type: LocalizedTextDto }) label: LocalizedTextDto;
  @ApiProperty() url: string;
  /** True for an absolute `https://` URL, which the site opens in a new tab
   *  with `rel="noopener noreferrer"`. Computed here rather than in the
   *  reader so both languages and every consumer agree on it. */
  @ApiProperty() isExternal: boolean;
}

/** A picture together with the point that must survive this slide's crop. */
export class HeroImagePublicResponseDto {
  @ApiProperty({ type: PublicImageDto }) image: PublicImageDto;
  @ApiProperty({ type: FocalPointDto }) focalPoint: FocalPointDto;
}

/** The landscape picture an English reader sees, already resolved from the
 *  slide's `ltrImageMode`: the reader draws what it is given and flips it only
 *  when told. The focal point is the one to use as sent, flipped already for a
 *  mirrored picture, so no consumer can apply the flip to the picture and
 *  forget it for the crop. */
export class HeroLtrImagePublicResponseDto extends HeroImagePublicResponseDto {
  @ApiProperty({ description: 'Draw the picture flipped horizontally (`ltrImageMode: mirror`).' })
  mirrored: boolean;
}

/** Public-safe `HeroSlide` shape — a distinct response class (never the raw
 *  document), matching the "never return raw from a public path" discipline
 *  used across every other public DTO. `active`/`scheduledFrom`/
 *  `scheduledTo` are the server-side visibility gate, not display data, so
 *  they're excluded here the same way `pageSections`'s window fields never
 *  reach a public reader.
 *
 *  The images arrive **resolved** rather than as ids (ADR-0070 D3's
 *  `PublicImageDto`, the shape every other public page already uses). The
 *  hero is the page's Largest Contentful Paint: a reader that received ids
 *  would have to make one more round trip per slide before it could even
 *  emit an `<img src>`, on the one element whose paint time is measured.
 *
 *  `mediaAssets.isAiGenerated` is deliberately **not** among these fields.
 *  The provenance mark is an internal editorial signal; the guarantee that it
 *  never reaches a visitor is this list, not a habit (owner decision
 *  2026-09-16). */
export class HeroSlidePublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: HERO_SLIDE_MEDIA_TYPES }) mediaType: HeroSlideMediaType;

  @ApiProperty({ type: HeroImagePublicResponseDto, required: false, nullable: true })
  desktop: HeroImagePublicResponseDto | null;

  /** The landscape picture for left-to-right readers. `null` exactly when
   *  `desktop` is, or when a `separate` picture no longer resolves; a reader
   *  then falls back to `desktop` unflipped rather than to an empty frame. */
  @ApiProperty({ type: HeroLtrImagePublicResponseDto, required: false, nullable: true })
  desktopLtr: HeroLtrImagePublicResponseDto | null;

  /** The phone crop, present only when the slide switched it on *and* the
   *  picture still resolves. A reader that finds `null` uses `desktop` with
   *  its own focal point; it never renders an empty frame. */
  @ApiProperty({ type: HeroImagePublicResponseDto, required: false, nullable: true })
  mobile: HeroImagePublicResponseDto | null;

  @ApiProperty({ required: false, nullable: true }) videoId: string | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  eyebrow: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) subtitle: LocalizedTextDto;

  @ApiProperty({ type: HeroCtaPublicResponseDto, required: false, nullable: true })
  primaryCta: HeroCtaPublicResponseDto | null;

  @ApiProperty({ type: HeroCtaPublicResponseDto, required: false, nullable: true })
  secondaryCta: HeroCtaPublicResponseDto | null;

  @ApiProperty() displayOrder: number;
}
