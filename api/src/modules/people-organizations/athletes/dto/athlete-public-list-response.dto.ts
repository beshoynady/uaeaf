import { ApiProperty } from '@nestjs/swagger';
import { AthletePublicResponseDto } from './athlete-public-response.dto.js';

/** Paginated envelope for `GET /athletes/public` — a dedicated class (not a
 *  shared generic) matching this module's existing preference for explicit,
 *  concrete response DTOs over generics (see `AthletePublicResponseDto`). */
export class AthletePublicListResponseDto {
  @ApiProperty({ type: [AthletePublicResponseDto] }) items: AthletePublicResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
