import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsMongoId, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { LocalizedTextDto } from '../../../../common/dto/localized-text.dto.js';

/** Request body for POST /navigation-items. */
export class CreateNavigationItemDto {
  @ApiProperty()
  @IsMongoId()
  menuId: string;

  @ApiProperty({ type: LocalizedTextDto })
  @ValidateNested()
  @Type(() => LocalizedTextDto)
  label: LocalizedTextDto;

  @ApiProperty({ description: 'Internal route, e.g. "/athletes".' })
  @IsString()
  @MinLength(1)
  url: string;

  @ApiProperty({ required: false, description: 'Parent item, for dropdown/flyout nesting.' })
  @IsOptional()
  @IsMongoId()
  parentItemId?: string;

  @ApiProperty()
  @IsInt()
  displayOrder: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** Request body for PATCH /navigation-items/:id/parent. */
export class SetParentItemDto {
  @ApiProperty({ required: false, nullable: true, description: 'New parent, or omit to detach.' })
  @IsOptional()
  @IsMongoId()
  parentItemId?: string | null;
}
