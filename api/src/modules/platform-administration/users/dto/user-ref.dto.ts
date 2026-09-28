import { ApiProperty } from '@nestjs/swagger';

/** What the archive and unarchive routes answer: the id of the account they
 *  acted on, and nothing else.
 *
 *  `users:Archive` and `users:Restore` are grantable while `users:Read` is
 *  reserved to the Super Admin, so a holder of either need not hold the read —
 *  and a full account shape here would hand them the email, the roles, the
 *  status and the last login for the price of an archive (ADR-0120 §D12). The
 *  id is what the caller already sent, so it discloses nothing. */
export class UserRefDto {
  @ApiProperty() id: string;
}
