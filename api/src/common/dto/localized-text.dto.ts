import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Reusable `{en, ar}` bilingual text shape, used across the FigJam
 *  Physical Model wherever a field is typed `{en,ar}`. */
export class LocalizedTextDto {
  @ApiProperty({ description: 'English text.' })
  @IsString()
  @MinLength(1)
  en: string;

  @ApiProperty({ description: 'Arabic text.' })
  @IsString()
  @MinLength(1)
  ar: string;
}
