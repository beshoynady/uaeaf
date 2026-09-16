import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsMongoId } from 'class-validator';

/**
 * Request body for `PATCH /strategic-plans-page/:id/lists/:list/order`: the
 * ids of the list's items in their new order, every one of them and nothing
 * else. A partial or padded set is refused by the service rather than
 * interpreted, so a stale dashboard cannot drop an item by reordering.
 */
export class ReorderPlanListDto {
  @ApiProperty({ type: [String], description: 'Every item id of the list, in the new order.' })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  ids: string[];
}
