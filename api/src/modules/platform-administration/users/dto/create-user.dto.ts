import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Request body for POST /users. */
export class CreateUserDto {
  @ApiProperty({ description: 'Full name, recorded in both Arabic and English.', type: LocalizedTextDto })
  // `@IsDefined()` is not redundant beside `@ValidateNested()`.
  // class-validator's nested executor returns early on an `undefined` value,
  // so without it a body omitting `name` passed the global ValidationPipe
  // and failed at the schema's `required: true` instead — reaching the
  // caller as a bare 500 for what is plainly a bad request.
  @IsDefined()
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

  @ApiProperty({
    description:
      'Roles the account starts with. Validated against the live roles collection; an unknown or archived id rejects the whole request. Omit for an account with no access.',
    type: [String],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  roleIds?: string[];

  @ApiProperty({
    description:
      'Optional link to the federationPersonnel record this account belongs to. Verified to exist before the account is written.',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsMongoId()
  personId?: string;
}
