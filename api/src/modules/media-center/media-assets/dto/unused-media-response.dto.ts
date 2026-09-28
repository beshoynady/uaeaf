import { ApiProperty } from '@nestjs/swagger';

/** One row of the unused-media report. `type` and `size` are read straight
 *  from `MediaFile.mimeType`/`MediaFile.size` — both already stored, so the
 *  column needs no schema change. `archivedBy` is the raw user id: resolving
 *  it to a display name would need `UsersModule`, which already reaches this
 *  module through `FederationPersonnelsModule` — the dashboard resolves it
 *  itself via the existing `GET /users/names`. */
export class UnusedMediaRowDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  originalName: string;

  @ApiProperty({ description: 'MediaFile.mimeType.' })
  type: string;

  @ApiProperty({ description: 'MediaFile.size, in bytes.' })
  size: number;

  @ApiProperty()
  archivedAt: Date;

  @ApiProperty({ nullable: true, description: 'The user id who archived it; resolve via GET /users/names.' })
  archivedBy: string | null;

  @ApiProperty()
  thumbnailUrl: string;
}

/**
 * `GET /media-assets/unused`. `total` and `totalSize` cover the whole
 * unreferenced, archived-past-the-window set — not the page — so the biggest
 * saving is knowable from page one, before paging through the rest.
 */
export class UnusedMediaReportDto {
  @ApiProperty({ type: [UnusedMediaRowDto] })
  items: UnusedMediaRowDto[];

  @ApiProperty({ description: 'Count across the whole set, not the page.' })
  total: number;

  @ApiProperty({ description: 'Sum of `size` across the whole set, in bytes.' })
  totalSize: number;
}
