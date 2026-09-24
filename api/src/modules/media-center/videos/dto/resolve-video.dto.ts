import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Request body for `POST /videos/resolve`.
 *
 * `MaxLength` before the URL ever reaches `parseVideoUrl`: a megabyte-long
 * string is not a link anyone pasted, and refusing it here means the parser
 * and `new URL()` are never asked to work on one.
 */
export class ResolveVideoDto {
  @ApiProperty({ description: 'The link an editor pasted.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  url: string;
}
