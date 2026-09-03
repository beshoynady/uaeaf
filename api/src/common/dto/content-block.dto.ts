import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto.js';

/** Request shape for one `ContentBlock` entry. */
export class ContentBlockDto {
  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  title: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description: LocalizedTextDto;

  @ApiProperty()
  @IsInt()
  displayOrder: number;
}

/** Request shape for one `IconedContentBlock` entry. */
export class IconedContentBlockDto extends ContentBlockDto {
  @ApiProperty({ description: 'Client-side icon identifier (e.g. a lucide-react name).' })
  @IsString()
  @MinLength(1)
  iconKey: string;
}
