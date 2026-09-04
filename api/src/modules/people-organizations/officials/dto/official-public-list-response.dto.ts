import { ApiProperty } from '@nestjs/swagger';
import { OfficialPublicResponseDto } from './official-public-response.dto.js';

/** Paginated envelope for `GET /officials/public` — mirrors
 *  `AthletePublicListResponseDto`. */
export class OfficialPublicListResponseDto {
  @ApiProperty({ type: [OfficialPublicResponseDto] }) items: OfficialPublicResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
