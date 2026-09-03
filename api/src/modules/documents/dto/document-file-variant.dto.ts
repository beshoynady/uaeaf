import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

/** Request-body shape for one language's file within `documents.file`. */
export class DocumentFileVariantDto {
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
  size: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  filename: string;
}
