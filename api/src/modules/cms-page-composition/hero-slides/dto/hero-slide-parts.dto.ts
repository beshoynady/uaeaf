import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';

/**
 * A hero text as a request carries it: both halves are strings, and either may
 * be empty while the slide is hidden. Lengths and completeness are the
 * service's to judge, on the slide the request produces
 * (`hero-slides.validation.ts`), where grapheme counting and visibility are
 * both known.
 */
export class HeroTextDto {
  @ApiProperty({ description: 'Arabic text; may be empty while the slide is hidden.' })
  @IsString()
  ar: string;

  @ApiProperty({ description: 'English text; may be empty while the slide is hidden.' })
  @IsString()
  en: string;
}
import { HERO_CTA_LABEL_MAX } from '../schemas/hero-cta.schema.js';

/**
 * One of a slide's two buttons, as a request carries it.
 *
 * Only `isVisible` is required. A hidden button may be sent empty, half
 * written, or with words an editor is keeping for later — the rule that a
 * button must be complete applies to a button a visitor can see, and is
 * enforced in `HeroSlidesService` where both halves of the condition are
 * known. Putting it in the DTO would make "hide it and finish the text
 * tomorrow" impossible to express.
 */
export class HeroCtaDto {
  @ApiProperty()
  @IsBoolean()
  isVisible: boolean;

  @ApiProperty({
    type: HeroTextDto,
    required: false,
    nullable: true,
    description: `Required in both languages when visible; at most ${HERO_CTA_LABEL_MAX} characters each (refused with \`incompleteCta\` / \`ctaLabelTooLong\`).`,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => HeroTextDto)
  label?: HeroTextDto | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Required when visible. Either an internal path beginning with a single `/` — the site adds the locale — or an absolute `https://` URL (refused with `invalidCtaUrl`).',
  })
  @IsOptional()
  @IsString()
  url?: string | null;
}

/** Where a picture must keep looking, in percentages of its own frame. */
export class FocalPointDto {
  @ApiProperty({ minimum: 0, maximum: 100, default: 50 })
  @IsNumber()
  @Min(0)
  @Max(100)
  x: number;

  @ApiProperty({ minimum: 0, maximum: 100, default: 50 })
  @IsNumber()
  @Min(0)
  @Max(100)
  y: number;
}
