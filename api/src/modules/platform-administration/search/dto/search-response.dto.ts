import { ApiProperty } from '@nestjs/swagger';
import { SEARCH_SOURCE_KEYS } from '../search-sources.js';

/** One matched row, already shaped for a result list — no field a client
 *  would need to resolve further. */
export class SearchHitDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true, type: String })
  subtitle: string | null;

  @ApiProperty({ description: 'A public site path, never an API route.' })
  href: string;

  @ApiProperty({ nullable: true, type: String })
  thumbnailId: string | null;
}

export class SearchGroupDto {
  @ApiProperty({ enum: SEARCH_SOURCE_KEYS })
  type: string;

  @ApiProperty({ description: 'Total matches for this source, independent of how many are returned.' })
  total: number;

  @ApiProperty({ type: [SearchHitDto] })
  items: SearchHitDto[];
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchGroupDto] })
  groups: SearchGroupDto[];
}
