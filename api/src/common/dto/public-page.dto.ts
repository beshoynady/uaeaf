import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from './localized-text.dto.js';

/**
 * The public shapes more than one page's projection is built from
 * (ADR-0070 D3). Each page still writes its own response class field by
 * field (ADR-0069 D3); these are only the parts that mean the same thing on
 * every page.
 */

/** The image shape the public page needs: where it is and what it says.
 *  Alt text belongs to the asset (`mediaAssets.altText`), so it travels
 *  with the image rather than being duplicated onto the page record. */
export class PublicImageDto {
  @ApiProperty() url: string;
  @ApiProperty({ type: LocalizedTextDto }) altText: LocalizedTextDto;
  @ApiProperty() width: number;
  @ApiProperty() height: number;
}

/** One value card. `iconKey` is one of the twelve approved keys. */
export class PublicValueDto {
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) description: LocalizedTextDto;
  @ApiProperty() iconKey: string;
  @ApiProperty() displayOrder: number;
}

/** One entry of an ordered list that carries no icon, such as a strategic
 *  goal. */
export class PublicContentBlockDto {
  @ApiProperty({ type: LocalizedTextDto }) title: LocalizedTextDto;
  @ApiProperty({ type: LocalizedTextDto }) description: LocalizedTextDto;
  @ApiProperty() displayOrder: number;
}

export class PublicSeoDto {
  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  metaTitle: LocalizedTextDto | null;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  metaDescription: LocalizedTextDto | null;

  @ApiProperty({ type: PublicImageDto, required: false, nullable: true })
  ogImage: PublicImageDto | null;
}
