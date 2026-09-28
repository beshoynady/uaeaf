import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** `GET /users/names` response row (ADR-0104 §D4) — exactly these two
 *  fields. No email, no roles, no account status: this route carries no
 *  permission, so the projection it answers with is the entire guarantee.
 *
 *  `displayName` is bilingual because the stored name is (`user.name` is
 *  `{en, ar}`, both required) — a single string would force the server to
 *  guess a locale the caller never stated. */
export class UserNameDto {
  @ApiProperty() id: string;
  @ApiProperty({ type: LocalizedTextDto }) displayName: LocalizedTextDto;
}
