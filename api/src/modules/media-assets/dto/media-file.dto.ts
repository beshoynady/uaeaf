import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

/** Request-body shape for `mediaAssets.file`. */
export class MediaFileDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  url: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  mimeType: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  width: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  height: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  size: number;
}
