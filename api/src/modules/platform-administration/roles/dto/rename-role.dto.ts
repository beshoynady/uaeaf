import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Request body for PATCH /roles/:id/name.
 *
 *  The route is named for the name but also carries the description, which
 *  was creation-only until 2026-09-08 — a description written with a mistake
 *  in it could be corrected only by deleting the role and rebuilding it.
 *  Omitting `description` leaves the stored one untouched; sending `null`
 *  clears it. */
export class RenameRoleDto {
  @ApiProperty({ description: 'New bilingual role name.', type: LocalizedTextDto })
  // `@IsDefined()` is not redundant beside `@ValidateNested()`.
  // class-validator's nested executor returns early on an `undefined` value,
  // so without it a body omitting `name` passed the global ValidationPipe
  // and failed at the schema's `required: true` instead — reaching the
  // caller as a bare 500 for what is plainly a bad request.
  @IsDefined()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({
    description:
      'Bilingual explanation of what the role is for. Omit to leave the stored description unchanged; send null to remove it.',
    type: LocalizedTextDto,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto | null;
}
