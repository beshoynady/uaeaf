import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId } from 'class-validator';

/** Request body for PATCH /roles/:id/permissions. */
export class UpdateRolePermissionsDto {
  @ApiProperty({ description: 'Full replacement list of permission ids for this role.', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  permissionIds: string[];
}
