import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Request-body shape for one `socialLinks[]` entry. */
export class SocialLinkDto {
  @ApiProperty({ description: 'e.g. "Instagram", "X".' })
  @IsString()
  @MinLength(1)
  platform: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  url: string;
}
