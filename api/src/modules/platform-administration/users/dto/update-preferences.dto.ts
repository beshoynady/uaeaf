import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { USER_LANGUAGES, USER_THEMES } from '../schemas/user.schema.js';
import type { UserLanguage, UserTheme } from '../schemas/user.schema.js';

/** Request body for PATCH /users/me/preferences.
 *
 *  Every field is optional and each is applied only if the key is present,
 *  so a client updating one preference cannot silently wipe the other.
 *  `null` is an accepted, meaningful value — it means "stop overriding,
 *  follow the system default" (request locale for language,
 *  `prefers-color-scheme` for theme) — which is why the validators allow
 *  null alongside the enum rather than rejecting it. */
export class UpdatePreferencesDto {
  @ApiProperty({
    description: 'Preferred dashboard language, or null to follow the request locale.',
    enum: USER_LANGUAGES,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn([...USER_LANGUAGES, null])
  preferredLanguage?: UserLanguage | null;

  @ApiProperty({
    description: 'Preferred colour theme, or null to follow the OS setting.',
    enum: USER_THEMES,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsIn([...USER_THEMES, null])
  preferredTheme?: UserTheme | null;
}
