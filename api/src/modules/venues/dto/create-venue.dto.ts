import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsMongoId, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

/** Request body for POST /venues. */
export class CreateVenueDto {
  @ApiProperty({ description: 'Bilingual venue name.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Country (or UAE emirate) this venue is in.' })
  @IsMongoId()
  countryId: string;

  @ApiProperty({ description: "Set when this venue is a specific club's home facility.", required: false })
  @IsOptional()
  @IsMongoId()
  ownerClubId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;
}
