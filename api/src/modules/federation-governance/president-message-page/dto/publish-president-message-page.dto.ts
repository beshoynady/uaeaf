import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsMongoId } from 'class-validator';

/**
 * Request body for `POST /president-message-page/:id/publish`.
 *
 * `expectedUpdatedAt` is the `updatedAt` the publisher was looking at when
 * they pressed publish. The server refuses if the record has moved since
 * (ADR-0069 D5): publishing a message someone else edited in the meantime
 * puts text on the federation's most visible governance page that the
 * publisher never read.
 *
 * It is required rather than optional — an optional concurrency check is
 * one a client eventually stops sending.
 */
export class PublishPresidentMessagePageDto {
  @ApiProperty({
    description: "The record's updatedAt as last read, ISO-8601. Publishing is refused if it has changed.",
    example: '2026-09-12T08:31:04.512Z',
  })
  @IsDateString()
  expectedUpdatedAt: string;
}

/** Request body for `POST /president-message-page/:id/restore`. */
export class RestorePresidentMessagePageDto {
  @ApiProperty({ description: 'The revision to copy back over the draft. Publishes nothing.' })
  @IsMongoId()
  revisionId: string;
}
