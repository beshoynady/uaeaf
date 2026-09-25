import { ApiProperty } from '@nestjs/swagger';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { APPOINTMENT_ROLE_TYPES } from '../schemas/federation-appointments.schema.js';
import type { AppointmentRoleType } from '../schemas/federation-appointments.schema.js';

/**
 * One serving officer, as an unauthenticated caller receives them.
 *
 * A distinct response class rather than a filtered personnel record, for the
 * same reason `FederationPersonnelPublicResponseDto` is one: the stored record
 * carries `internalContact` (`[RESTRICTED]`), contact details and a biography,
 * and a denylist would have to be remembered again every time a field is
 * added. Listing the five fields that may leave is the version that stays
 * correct on its own.
 *
 * `displayOrder` is here because the order is the board's decision and a
 * caller rendering a grid needs it; it is dropped again by the About page's
 * own projection, which has already used it to sort.
 */
export class AppointmentPublicResponseDto {
  @ApiProperty({ type: LocalizedTextDto })
  fullName: LocalizedTextDto;

  @ApiProperty({ type: LocalizedTextDto, description: 'The specific title within the role, e.g. "نائب الرئيس".' })
  positionTitle: LocalizedTextDto;

  @ApiProperty({ enum: APPOINTMENT_ROLE_TYPES })
  roleType: AppointmentRoleType;

  @ApiProperty({ description: 'The order the board set for its own listing.' })
  displayOrder: number;

  @ApiProperty({ required: false, nullable: true, description: 'ref → mediaAssets, or null.' })
  photoId: string | null;
}
