import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsMongoId } from 'class-validator';

/** Request body for PATCH /users/:id/roles. */
export class AssignRolesDto {
  @ApiProperty({ description: 'Full replacement list of role ids for this user.', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  roleIds: string[];
}
