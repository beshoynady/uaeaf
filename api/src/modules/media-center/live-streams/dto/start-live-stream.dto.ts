import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDate, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { ContentAssociationDto } from '../../albums/dto/content-association.dto.js';

/** Request body for POST /live-streams.
 *
 *  `startedAt` is absent on purpose: a broadcast starts when the editor
 *  presses the button, and accepting a start time would let the banner claim
 *  a stream began at a moment it did not. */
export class StartLiveStreamDto {
  @ApiProperty({ description: 'A YouTube link. Format-checked only.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  url: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  venue?: LocalizedTextDto | null;

  @ApiProperty({ description: 'When the live state stops showing, with nobody pressing anything.' })
  @Type(() => Date)
  @IsDate()
  expectedEndAt: Date;

  @ApiProperty({ type: [ContentAssociationDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentAssociationDto)
  associations?: ContentAssociationDto[];
}
