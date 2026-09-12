import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto.js';
import { PUBLICATION_ENTITY_TYPES } from '../../../common/constants/workflow-entity-types.js';
import type { PublicationEntityType } from '../../../common/constants/workflow-entity-types.js';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

/**
 * What became of a version.
 *
 * `Draft` is not a `publications.status` value — it is the absence of a
 * publications row, and it is the common case: most versions are saved,
 * read, and superseded without ever going live. Naming it here rather than
 * leaving the field null keeps the four states in one closed list the
 * dashboard can translate.
 */
export const REVISION_PUBLICATION_STATES = ['Draft', 'Live', 'Unpublished', 'Archived'] as const;
export type RevisionPublicationState = (typeof REVISION_PUBLICATION_STATES)[number];

/**
 * Query for `GET /revisions`: which record's history to list, and which page
 * of it.
 *
 * Extends the shared pagination shape rather than naming its own parameters,
 * so `page` and `limit` mean here what they mean on every other list in this
 * API and the 200 cap is the same one.
 *
 * The default is lower than the shared 50. A version history is read in a
 * side panel next to the record, a few entries at a time — not scanned like
 * a directory — and this route is generic: `articles` and
 * `governanceDocuments` reach hundreds of versions where this page will have
 * a handful (owner decision 2026-09-12).
 */
export class ListRevisionsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Versions per page (max 200).', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  override limit?: number = 20;

  @ApiProperty({ enum: PUBLICATION_ENTITY_TYPES, description: 'The entity type whose history to list.' })
  @IsIn(PUBLICATION_ENTITY_TYPES)
  entityType: PublicationEntityType;

  @ApiProperty({ description: 'The id of the record whose history to list.' })
  @IsMongoId()
  entityId: string;
}

/** Who saved a version. A name, never the account behind it. */
export class RevisionActorDto {
  @ApiProperty()
  id: string;

  @ApiProperty({
    type: LocalizedTextDto,
    nullable: true,
    description: 'Null when the account no longer exists — history outlives accounts.',
  })
  name: LocalizedTextDto | null;
}

/** One version in a record's history, without its content. */
export class RevisionSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Version number within this record, starting at 1.' })
  versionNumber: number;

  @ApiProperty({ description: 'ISO date the version was frozen.' })
  createdAt: string;

  @ApiProperty({ type: RevisionActorDto, nullable: true })
  createdBy: RevisionActorDto | null;

  @ApiProperty({ enum: REVISION_PUBLICATION_STATES })
  state: RevisionPublicationState;

  @ApiProperty({ nullable: true, description: 'ISO date this version went live; null if it never did.' })
  publishedAt: string | null;
}

/**
 * One page of a record's history.
 *
 * A concrete class rather than a generic, matching this codebase's existing
 * paginated envelopes (`AthletePublicListResponseDto`).
 */
export class RevisionHistoryPageDto {
  @ApiProperty({ type: [RevisionSummaryDto] })
  items: RevisionSummaryDto[];

  @ApiProperty({ description: 'Versions this record has in all, not on this page.' })
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}

/** One version with its content, for reading it back. */
export class RevisionDetailDto extends RevisionSummaryDto {
  @ApiProperty({ enum: PUBLICATION_ENTITY_TYPES })
  entityType: PublicationEntityType;

  @ApiProperty()
  entityId: string;

  @ApiProperty({
    type: Object,
    description:
      'The frozen content, reduced to the fields `REVISION_READ_FIELDS` names for this entity type. ' +
      'Never the raw snapshot: a version frozen before a field was retired still carries it.',
  })
  content: Record<string, unknown>;
}
