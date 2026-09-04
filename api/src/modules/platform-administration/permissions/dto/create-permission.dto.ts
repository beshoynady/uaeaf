import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PERMISSION_ACTIONS } from '../schemas/permission.schema.js';
import type { PermissionAction } from '../schemas/permission.schema.js';

/** Request body for POST /permissions. */
export class CreatePermissionDto {
  @ApiProperty({
    description: 'Bilingual human-readable permission label, e.g. { en: "View users", ar: "عرض المستخدمين" }.',
    type: LocalizedTextDto,
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Name of the collection this permission gates, e.g. "users".' })
  @IsString()
  @MinLength(1)
  resourceType: string;

  @ApiProperty({
    description: 'The action this permission grants.',
    enum: PERMISSION_ACTIONS,
  })
  @IsIn(PERMISSION_ACTIONS)
  action: PermissionAction;
}
