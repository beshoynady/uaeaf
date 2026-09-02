import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsMongoId, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../common/dto/localized-text.dto.js';

/** Request body for POST /roles. */
export class CreateRoleDto {
  @ApiProperty({ description: 'Bilingual role name, e.g. { en: "News Approver", ar: "معتمد الأخبار" }.', type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  name: LocalizedTextDto;

  @ApiProperty({ description: 'Permission ids granted to this role.', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  permissionIds: string[];
}
