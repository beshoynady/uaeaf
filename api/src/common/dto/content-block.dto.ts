import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from './localized-text.dto.js';
import { VALUE_ICON_KEYS } from '../constants/value-icon-keys.js';
import type { ValueIconKey } from '../constants/value-icon-keys.js';

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

/** Request shape for one `IconKeyedContentBlock` entry — `iconKey` closed
 *  to the twelve keys of `VALUE_ICON_KEYS` (ADR-0069 D2). */
export class IconKeyedContentBlockDto extends ContentBlockDto {
  @ApiProperty({ enum: VALUE_ICON_KEYS, description: 'One of the twelve approved icon keys.' })
  @IsIn(VALUE_ICON_KEYS)
  iconKey: ValueIconKey;
}
