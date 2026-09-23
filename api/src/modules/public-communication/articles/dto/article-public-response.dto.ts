import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PageSeoDto } from '../../../../common/dto/page-seo.dto.js';
import { richTextParagraphs } from '../../../../common/rich-text/rich-text-plain-text.js';
import { ARTICLE_CATEGORIES, ARTICLE_TOPICS } from '../schemas/article.schema.js';
import type { ArticleCategory, ArticleDocument, ArticleTopic } from '../schemas/article.schema.js';

/**
 * One article as a visitor receives it.
 *
 * Built from the frozen revision, never from the article row: the row says
 * WHICH articles are live and in what order, and every word shown comes from
 * the snapshot the approvers approved. `createdBy`, `updatedBy` and the rest
 * of the bookkeeping are absent because this is an allowlist rather than a
 * redaction — a field added to the schema later does not leak by default.
 */
export class ArticlePublicDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: ARTICLE_CATEGORIES })
  category: ArticleCategory;

  @ApiProperty({
    enum: ARTICLE_TOPICS,
    nullable: true,
    description: 'What the story is about; null for an article nobody has classified yet.',
  })
  topic: ArticleTopic | null;

  @ApiProperty({
    type: [String],
    description:
      'Free labels, as the newsroom typed them. The badge a reader sees and the value a tag link ' +
      'carries are the same string.',
  })
  tags: string[];

  @ApiProperty({ type: LocalizedTextDto })
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  authorDisplayName: LocalizedTextDto;

  @ApiProperty({ nullable: true, description: 'ISO date this article went live; null while it never has.' })
  publishDate: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'Who published the story first. Non-null only on a `FederationInMedia` round-up, and null on the ' +
      'rows written before the field existed.',
  })
  sourceOutlet: string | null;

  @ApiProperty({
    nullable: true,
    description: "The original article's address, for the external link beside the attribution.",
  })
  sourceUrl: string | null;

  @ApiProperty({ nullable: true, description: 'ref → mediaAssets; the reader resolves it through the media route.' })
  coverMediaId: string | null;

  @ApiProperty({ type: 'object', additionalProperties: true, description: 'One ProseMirror document per language.' })
  body: { ar: unknown; en: unknown };

  @ApiProperty({
    type: LocalizedTextDto,
    description:
      'The opening of each language, plain. Derived rather than stored: a second field for the ' +
      'summary is a second thing to keep true, and the card and the meta description both want this.',
  })
  excerpt: LocalizedTextDto;

  @ApiProperty({ type: PageSeoDto, nullable: true })
  seo: PageSeoDto | null;
}

/** Long enough to say what the story is; short enough that a search result
 *  shows all of it rather than cutting mid-thought. */
const EXCERPT_MAX = 160;

/**
 * The first paragraph as plain text, clipped on a word boundary.
 *
 * Clipped at a space rather than at the character, so a card never ends
 * mid-word. A first paragraph with no space inside the limit keeps its hard
 * clip, which is the right answer for a run of text that is not prose.
 */
const excerptOf = (body: unknown): string => {
  const [first = ''] = richTextParagraphs(body);
  if (first.length <= EXCERPT_MAX) {
    return first;
  }
  const clipped = first.slice(0, EXCERPT_MAX);
  const lastSpace = clipped.lastIndexOf(' ');
  return `${lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped}…`;
};

const asLocalized = (value: unknown): LocalizedTextDto => {
  const text = (value ?? {}) as Partial<LocalizedTextDto>;
  return { ar: text.ar ?? '', en: text.en ?? '' };
};

/**
 * The public view of one article.
 *
 * `article` supplies only what belongs to the record rather than to its text —
 * its identity and the date it went live. Everything a reader reads comes from
 * `snapshot`, which is the revision that was approved and published.
 */
export const toPublicDto = (article: ArticleDocument, snapshot: Record<string, unknown>): ArticlePublicDto => {
  const body = (snapshot.body ?? { ar: null, en: null }) as { ar: unknown; en: unknown };
  const coverMediaId = snapshot.coverMediaId;

  return {
    id: (article._id as Types.ObjectId).toString(),
    // From the snapshot, so a slug edited after publication does not change
    // the address of the version that is actually on the site.
    slug: String(snapshot.slug ?? article.slug),
    // From the row, not the snapshot: which shelf an item sits on is a
    // filing decision the newsroom may correct after publication without
    // republishing the words.
    category: article.category,
    // From the row too, and null for a row written before the field existed.
    topic: article.topic ?? null,
    // From the row, like the category beside it: a label is a filing decision
    // the newsroom may correct without republishing the words, and the filter
    // queries the row rather than every snapshot.
    tags: article.tags ?? [],
    // From the row for the same reason the category is: where a round-up came
    // from is a filing decision an editor may correct without republishing
    // the words. Carried only for the category it describes, so a `General`
    // article cannot surface an attribution left behind by a conversion.
    sourceOutlet: article.category === 'FederationInMedia' ? (article.sourceOutlet ?? null) : null,
    sourceUrl: article.category === 'FederationInMedia' ? (article.sourceUrl ?? null) : null,
    title: asLocalized(snapshot.title),
    authorDisplayName: asLocalized(snapshot.authorDisplayName),
    // The record's, not the snapshot's: the date is stamped at publication,
    // and the snapshot was frozen before that moment.
    publishDate: article.publishDate ? article.publishDate.toISOString() : null,
    coverMediaId: coverMediaId ? String(coverMediaId) : null,
    body,
    excerpt: { ar: excerptOf(body.ar), en: excerptOf(body.en) },
    seo: (snapshot.seo as PageSeoDto | null) ?? null,
  };
};
