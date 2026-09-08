import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ACCOUNT_STATUSES } from '../schemas/user.schema.js';
import type { AccountStatus } from '../schemas/user.schema.js';

/**
 * Request body for PATCH /users/:id/status.
 *
 * Three values, not two. `Suspended` holds a live account — a person under
 * review who is expected back — while `Deactivated` closes one. Collapsing
 * them would lose the distinction the schema already draws, and the auth
 * flow treats both alike only in that neither may sign in.
 */
export class UpdateAccountStatusDto {
  @ApiProperty({
    description:
      'The account state to move to. Anything other than Active also ends every live session for that account.',
    enum: ACCOUNT_STATUSES,
  })
  @IsIn(ACCOUNT_STATUSES)
  accountStatus: AccountStatus;
}
