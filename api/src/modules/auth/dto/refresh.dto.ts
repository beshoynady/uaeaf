import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

/** Request body for POST /auth/refresh. */
export class RefreshDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refreshToken: string;
}
