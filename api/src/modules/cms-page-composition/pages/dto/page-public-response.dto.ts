import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Public-safe per-page SEO overrides. `ogImageId` is serialised to a string
 *  so the shape is transport-ready and never leaks an `ObjectId`. */
export class PageSeoPublicResponseDto {
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  metaTitle: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  metaDescription: LocalizedTextDto | null;

  @ApiProperty({ required: false, nullable: true })
  ogImageId: string | null;
}

/** Public-safe `Page` shape — a distinct response class, never the raw
 *  document, matching the "never return raw from a public path" discipline
 *  every other public DTO in this codebase follows.
 *
 *  `status` is deliberately excluded: it is the server-side routing gate
 *  (`findPublishedBySlug` only ever resolves a `Published` row), not display
 *  data — the same reasoning that keeps `heroSlides.active` and
 *  `pageSections.enabled`/`visibility` out of their public shapes. The
 *  `BaseSchema` audit trail (`createdBy`/`updatedBy`/`archivedAt`/
 *  `archivedBy`) is excluded for the same reason it is everywhere else:
 *  it is operator data, not visitor data.
 *
 *  Added 2026-09-07 — before this, `GET /pages/public/:slug` returned the
 *  raw Mongoose document, leaking the audit trail and giving Swagger (and
 *  therefore the generated frontend client) no response type at all. */
export class PagePublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: PageSeoPublicResponseDto, required: false, nullable: true })
  seo: PageSeoPublicResponseDto | null;
}
