import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/**
 * What an unauthenticated reader may see of a club.
 *
 * Three fields and an id, because one caller needs them: the albums filter
 * draws a name and filters by an id, and a card may show a crest. Every other
 * field on `clubs` is administrative — registration number, address, email,
 * phone, founding date — and an endpoint anyone can call has no business
 * carrying it.
 *
 * Built field by field in the service rather than by deleting keys from the
 * document, so a field added to the schema later cannot appear here by
 * default. Guarded by `clubs.public.spec.ts`.
 */
export class ClubPublicResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) name: LocalizedTextDto;
  @ApiProperty() slug: string;
  @ApiProperty({ required: false, nullable: true, description: 'MediaAsset id of the club crest.' })
  logoId: string | null;
}

export class ClubPublicListResponseDto {
  @ApiProperty({ type: [ClubPublicResponseDto] }) items: ClubPublicResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
