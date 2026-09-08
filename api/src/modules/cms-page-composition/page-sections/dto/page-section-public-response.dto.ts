import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import {
  PAGE_SECTION_SELECTION_MODES,
  PAGE_SECTION_TYPES,
} from '../schemas/page-sections.schema.js';
import type { PageSectionSelectionMode, PageSectionType } from '../schemas/page-sections.schema.js';

/** Public-safe `PageSection` shape — what a renderer needs to draw one
 *  composed section of a page, and nothing more.
 *
 *  Deliberately excluded, and why:
 *  - `enabled`, `visibility`, `visibleFrom`, `visibleUntil` — the visibility
 *    gate. It has already done its job in `findPublicByPage()`; a public
 *    reader only ever receives sections that passed it, so shipping the gate
 *    itself would leak scheduling intent (e.g. that a championship promo is
 *    queued for a future date) with no rendering benefit.
 *  - `filters` — server-side query configuration for `AUTOMATIC` mode, not
 *    display data. Exposing it would publish internal query shapes.
 *  - `pageId` — the caller already supplied it to reach this endpoint.
 *  - The `BaseSchema` audit trail — operator data, not visitor data.
 *
 *  `configuration` IS included: it holds per-section presentation settings
 *  (the board's own description) that the renderer needs.
 *
 *  Added 2026-09-07 — before this, `GET /pageSections/public/by-page/:pageId`
 *  returned raw Mongoose documents, leaking the visibility gate and the audit
 *  trail, and giving Swagger no response type. */
export class PageSectionPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: PAGE_SECTION_TYPES }) sectionType: PageSectionType;

  /** Null falls back to a per-`sectionType` default resolved client-side. */
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  sectionTitle: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  sectionSubtitle: LocalizedTextDto | null;

  @ApiProperty({ required: false, nullable: true }) itemLimit: number | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  ctaText: LocalizedTextDto | null;

  @ApiProperty({ required: false, nullable: true }) ctaUrl: string | null;
  @ApiProperty() displayOrder: number;
  @ApiProperty({ enum: PAGE_SECTION_SELECTION_MODES }) selectionMode: PageSectionSelectionMode;

  /** Manually-selected entity ids, serialised. Their target collection is
   *  inferable only from `sectionType` — the board's schema carries no
   *  per-entry type discriminator (documented asymmetry, not an oversight). */
  @ApiProperty({ type: [String] }) items: string[];

  @ApiProperty({ required: false, nullable: true })
  configuration: Record<string, unknown> | null;
}
