import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsMongoId } from 'class-validator';

/** How many photos one album may hold. Not a storage limit — a limit on what
 *  a single reorder request may rewrite, and on what a grid can present
 *  without becoming a scroll nobody finishes. */
export const ALBUM_MAX_PHOTOS = 500;

/** Request body for `PATCH /albums/:id/photos/order`.
 *
 *  Carries the complete order, not a move instruction. A "move photo 7 to
 *  position 2" API has to be applied in the order the requests arrive, and two
 *  editors dragging at once would interleave into an arrangement neither
 *  chose; a whole order is last-write-wins, which at least belongs to somebody. */
export class AlbumPhotoOrderDto {
  @ApiProperty({
    type: [String],
    description: "Every photo of the album, exactly once, in the order they should appear.",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ALBUM_MAX_PHOTOS)
  @IsMongoId({ each: true })
  photoIds: string[];
}

/** Request body for `PATCH /albums/:id/cover`. */
export class AlbumCoverDto {
  @ApiProperty({ description: 'A photo of this album.' })
  @IsMongoId()
  photoId: string;
}
