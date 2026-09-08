import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';
import { PERMISSION_ACTIONS } from '../schemas/permission.schema.js';
import type { PermissionAction } from '../schemas/permission.schema.js';
import { PERMISSION_RESOURCES } from '../../../../common/constants/permission-resources.js';
import type { PermissionResource } from '../../../../common/constants/permission-resources.js';

/** Request body for POST /permissions. */
export class CreatePermissionDto {
  @ApiProperty({
    description: 'Bilingual human-readable permission label, e.g. { en: "View users", ar: "عرض المستخدمين" }.',
    type: LocalizedTextDto,
  })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({
    description: 'The collection this permission gates. Must be a known guarded resource.',
    enum: PERMISSION_RESOURCES,
  })
  @IsIn(PERMISSION_RESOURCES)
  resourceType: PermissionResource;

  @ApiProperty({
    description: 'The action this permission grants.',
    enum: PERMISSION_ACTIONS,
  })
  @IsIn(PERMISSION_ACTIONS)
  action: PermissionAction;
}
