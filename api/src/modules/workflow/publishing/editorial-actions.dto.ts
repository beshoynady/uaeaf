import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId } from 'class-validator';

/**
 * Request bodies for the editorial actions every workflow-governed page
 * mounts on its own controller: `POST :id/publish` and `POST :id/restore`.
 *
 * Shared because the actions are identical for every such page and
 * `PublishingService` takes an `entityType`, not a page. The President's
 * Message still declares its own copies; they carry the same fields and the
 * same rules (ADR-0069 D5).
 */
export class PublishEditorialDto {
  @ApiProperty({
    description: "The record's updatedAt as last read, ISO-8601. Publishing is refused if it has changed.",
    example: '2026-09-14T08:31:04.512Z',
  })
  @IsDateString()
  expectedUpdatedAt: string;
}

export class RestoreEditorialDto {
  @ApiProperty({ description: 'The revision to copy back over the draft. Publishes nothing.' })
  @IsMongoId()
  revisionId: string;
}
