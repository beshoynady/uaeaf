import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import {
  PublicImageDto,
  PublicSeoDto,
  PublicValueDto,
} from '../../../../common/dto/public-page.dto.js';

/**
 * What `/about/president` receives — an explicit list of fields, built
 * field by field from the published snapshot (ADR-0069 D3).
 *
 * Nothing in this entity is secret today, and that is precisely why the
 * list is written down now: the stored row also carries
 * `federationAppointmentId`, `createdBy`/`updatedBy`, `archivedAt` and both
 * timestamps, and the next field added to the collection would otherwise
 * reach the public site the day it is added. A projection that must be
 * edited to EXPOSE a field fails closed; one that must be edited to HIDE a
 * field fails open.
 */
export class PresidentMessagePublicResponseDto {
  @ApiProperty({ type: LocalizedTextDto }) heroTitle: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) heroSubtitle: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) signatoryName: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) signatoryTitle: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  pullQuote: LocalizedTextDto | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description: 'Bilingual ProseMirror documents: { ar, en }. Rendered node by node, never as HTML.',
  })
  messageBody: Record<string, unknown>;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  valuesTitle: LocalizedTextDto | null;

  @ApiProperty({ type: [PublicValueDto] }) values: PublicValueDto[];

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  heroImage: PublicImageDto | null;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  featuredImage: PublicImageDto | null;

  @ApiProperty({ type: PublicSeoDto, required: false, nullable: true })
  seo: PublicSeoDto | null;

  @ApiProperty({
    description:
      'When the message was published — the date it is signed with. Derived from the Live publication, ' +
      'never stored on the record (ADR-0069 D2).',
  })
  publishedAt: string;
}
