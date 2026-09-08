import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDefined, IsMongoId, IsOptional, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Request body for POST /roles. */
export class CreateRoleDto {
  @ApiProperty({ description: 'Bilingual role name, e.g. { en: "News Approver", ar: "معتمد الأخبار" }.', type: LocalizedTextDto })
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
    description: 'Bilingual explanation of what this role is for. Optional.',
    type: LocalizedTextDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  description?: LocalizedTextDto;

  @ApiProperty({ description: 'Permission ids granted to this role.', type: [String] })
  @IsArray()
  @IsMongoId({ each: true })
  permissionIds: string[];
}
