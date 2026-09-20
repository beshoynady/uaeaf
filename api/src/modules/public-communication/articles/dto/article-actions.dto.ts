import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString } from 'class-validator';

/** Request body for `POST /articles/:id/publish` — the no-review path. */
export class PublishArticleDto {
  @ApiProperty({
    description:
      'The `updatedAt` the editor was looking at. Publishing a record someone else edited in the ' +
      'meantime publishes an edit nobody chose to publish, so the server compares before freezing.',
  })
  @IsDateString()
  expectedUpdatedAt: string;
}

/** Request body for `PATCH /articles/:id/archived`. */
export class SetArchivedDto {
  @ApiProperty({
    description:
      'True hides a published article from the feed; false returns it. The article stays published ' +
      'either way and keeps its URL — this is visibility, not retraction.',
  })
  @IsBoolean()
  archived: boolean;
}
