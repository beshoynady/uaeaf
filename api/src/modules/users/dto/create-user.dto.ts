import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

/** Request body for POST /users. */
export class CreateUserDto {
  @ApiProperty({ description: 'Full name, recorded in both Arabic and English.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Login email, must be unique.' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Plaintext password — hashed before storage, never persisted as-is.' })
  @IsString()
  @MinLength(12)
  password: string;
}
