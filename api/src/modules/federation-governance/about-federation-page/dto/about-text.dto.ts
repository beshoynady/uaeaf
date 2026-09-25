import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';

/**
 * Bilingual text with a ceiling.
 *
 * `LocalizedTextDto` has no upper bound, which is right for a name but wrong
 * for copy that has to fit a card: a heading long enough to wrap four times
 * pushes the composition apart, and the editor finds out only by publishing.
 * The two ceilings here are the shapes the approved page actually draws — a
 * line, and a paragraph — so a caller picks the one the field is, rather than
 * a number.
 */

/** A heading, an eyebrow, a badge, a button's words: one line. */
export const TITLE_MAX = 160;

/** A paragraph: the story's two, a section's standfirst, a card's body. */
export const PROSE_MAX = 800;

export class TitleTextDto {
  @ApiProperty({ maxLength: TITLE_MAX, description: 'English text.' })
  @IsString()
  @MinLength(1)
  @MaxLength(TITLE_MAX)
  en: string;

  @ApiProperty({ maxLength: TITLE_MAX, description: 'Arabic text.' })
  @IsString()
  @MinLength(1)
  @MaxLength(TITLE_MAX)
  ar: string;
}

export class ProseTextDto {
  @ApiProperty({ maxLength: PROSE_MAX, description: 'English text. `**bold**` reads as emphasis.' })
  @IsString()
  @MinLength(1)
  @MaxLength(PROSE_MAX)
  en: string;

  @ApiProperty({ maxLength: PROSE_MAX, description: 'Arabic text. `**bold**` reads as emphasis.' })
  @IsString()
  @MinLength(1)
  @MaxLength(PROSE_MAX)
  ar: string;
}

/**
 * Where a link may point.
 *
 * Two shapes and no others: a path inside this site, or an `https://` address.
 *
 * The rule exists because this value is written by an editor and ends up in an
 * `href` a visitor clicks. `javascript:` and `data:` URLs execute in the
 * page's own origin — an editor with nothing but the Update grant could
 * otherwise run script against every visitor, which is a larger permission
 * than editing a page is meant to carry. Plain `http://` is refused because a
 * federation page should not downgrade a reader to an unencrypted hop, and
 * protocol-relative `//host` is refused because it reads as a path and behaves
 * as an external address.
 *
 * An allowlist rather than a list of dangerous schemes: the schemes a browser
 * will execute are not a closed set, and a denylist is only ever as current as
 * the day it was written.
 */
const SAFE_HREF = /^(?:\/(?!\/)[^\s]*|https:\/\/[^\s]+)$/;

/** A link an editor points somewhere: its words, and where it goes. */
export class AboutLinkDto {
  @ApiProperty({ type: TitleTextDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => TitleTextDto)
  label: TitleTextDto;

  @ApiProperty({ example: '/about/governance/policies' })
  @IsString()
  @Matches(SAFE_HREF, {
    message: 'href must be a path inside this site ("/…") or an https:// address.',
  })
  href: string;
}
