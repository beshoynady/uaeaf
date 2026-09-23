import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { LocalizedRichTextDto } from '../../../../common/dto/localized-rich-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { ARTICLE_CATEGORIES, ARTICLE_TOPICS } from '../schemas/article.schema.js';
import type { ArticleCategory, ArticleTopic } from '../schemas/article.schema.js';

/**
 * Lowercase letters, digits, and single hyphens between them.
 *
 * Latin-only for both languages, deliberately: the slug is one shared URL, and
 * a percent-encoded Arabic segment is unreadable in exactly the places a news
 * item travels — a pasted link, a message, a printed reference.
 */
export const ARTICLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * When the source attribution is judged at all.
 *
 * Required on a `FederationInMedia` round-up, because the outlet and its
 * address are what make it one. Otherwise judged only when a value was
 * actually sent, so an ordinary article is never held up by fields that do
 * not apply to it and `null` stays available for clearing them.
 */
export const VALIDATES_SOURCE = (dto: { category?: ArticleCategory }, value: unknown): boolean =>
  dto.category === 'FederationInMedia' || (value !== undefined && value !== null);

/** `http:`/`https:` only. Anything else is printed as a link that either
 *  leads nowhere or, in the case of `javascript:`, runs on click. */
/** Typed off the decorator itself: `IsURLOptions` lives in a global namespace
 *  the app's `tsconfig` does not pull in, and `as const` makes the array
 *  readonly, which the decorator's mutable parameter refuses. */
export const SOURCE_URL_RULES: Parameters<typeof IsUrl>[0] = {
  protocols: ['http', 'https'],
  require_protocol: true,
};

const SOURCE_OUTLET_MESSAGE =
  'sourceOutlet: اسم الجهة الإعلامية مطلوب لمقالات «الاتحاد في الإعلام» — a FederationInMedia article must name the outlet that published it first.';

const SOURCE_URL_MESSAGE =
  "sourceUrl: رابط المقال الأصلي مطلوب وصحيح لمقالات «الاتحاد في الإعلام» — a FederationInMedia article must carry the original article's http(s) address.";

const SLUG_MESSAGE =
  'slug must be lowercase letters and digits joined by single hyphens, e.g. "national-championship-2026"';

/** Request body for `POST /articles`. */
export class CreateArticleDto {
  @ApiProperty({ type: LocalizedTextDto, description: 'The headline, in both languages.' })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({
    enum: ARTICLE_CATEGORIES,
    required: false,
    default: 'General',
    description:
      "Which shelf of the newsroom this belongs on. Not `externalMediaCoverage`, which is a " +
      'separate collection of links to coverage published elsewhere — this labels an article the ' +
      'federation wrote itself. Omitted means General.',
  })
  @IsOptional()
  @IsIn(ARTICLE_CATEGORIES)
  category?: ArticleCategory;

  @ApiProperty({
    enum: ARTICLE_TOPICS,
    description:
      'What the story is about. Required on a new article; articles written before the field existed ' +
      'have none. Not `category` (the shelf) and not `tags` (free words).',
  })
  @IsIn(ARTICLE_TOPICS)
  topic: ArticleTopic;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Who published the story first. REQUIRED when `category` is `FederationInMedia` — that category ' +
      "means the federation is reporting somebody else's coverage, and the outlet is what makes it one. " +
      'Never asked of a `General` article.',
    example: 'Gulf News',
  })
  @ValidateIf(VALIDATES_SOURCE)
  // Trimmed before it is judged: `@IsNotEmpty()` rejects `''` and nothing
  // else, so `"   "` would satisfy a required field with no outlet in it.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: SOURCE_OUTLET_MESSAGE })
  @IsNotEmpty({ message: SOURCE_OUTLET_MESSAGE })
  @MaxLength(120)
  sourceOutlet?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      "The original article's address, `http(s)` only. REQUIRED when `category` is `FederationInMedia`, " +
      'alongside `sourceOutlet`. Never asked of a `General` article.',
    example: 'https://gulfnews.com/sport/athletics/uae-team-named-1.12345',
  })
  @ValidateIf(VALIDATES_SOURCE)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsUrl(SOURCE_URL_RULES, { message: SOURCE_URL_MESSAGE })
  @MaxLength(2048)
  sourceUrl?: string | null;

  @ApiProperty({
    type: [String],
    required: false,
    default: [],
    description: 'Free labels for display and filtering. NOT a second category: `category` is a closed list of one, and it decides which homepage section the article appears in.',
    example: ['ألعاب القوى', 'Relay'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @ApiProperty({
    description: 'URL segment, shared by both language editions of the story.',
    example: 'national-championship-results-2026',
  })
  @IsString()
  @MaxLength(120)
  @Matches(ARTICLE_SLUG_PATTERN, { message: SLUG_MESSAGE })
  slug: string;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, must be an image.' })
  @IsOptional()
  @IsMongoId()
  coverMediaId?: string | null;

  @ApiProperty({ type: LocalizedRichTextDto, description: 'The article body, one document per language.' })
  @ValidateNested()
  @Type(() => LocalizedRichTextDto)
  body: LocalizedRichTextDto;

  @ApiProperty({
    type: LocalizedTextDto,
    description: 'The byline readers see. May differ from the account that wrote the article.',
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  authorDisplayName: LocalizedTextDto;

  @ApiProperty({
    type: PageSeoDto,
    required: false,
    nullable: true,
    description: 'Overrides for the page title, description and share image. Absent means fall back to the headline.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PageSeoDto)
  seo?: PageSeoDto | null;
}
