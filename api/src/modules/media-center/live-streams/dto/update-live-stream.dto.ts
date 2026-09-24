import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Request body for PATCH /live-streams/:id — the banner's "edit" button.
 *
 *  `isActive` and `endedAt` are absent: ending a broadcast is its own route,
 *  so that the one action with a side effect on every other row cannot happen
 *  by accident inside a title change. */
export class UpdateLiveStreamDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;

  @ApiProperty({ type: LocalizedTextDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title?: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, required: false, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  venue?: LocalizedTextDto | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expectedEndAt?: Date;
}
