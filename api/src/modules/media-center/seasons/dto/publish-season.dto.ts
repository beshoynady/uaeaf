import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/** Request body for `PATCH /seasons/:id/publish` — mirrors
 *  `PublishArticleDto`, the shape every `PublishingService.publishDirect`
 *  route takes. */
export class PublishSeasonDto {
  @ApiProperty({
    description:
      'The `updatedAt` the editor was looking at. Publishing a record someone else edited in the ' +
      'meantime publishes an edit nobody chose to publish, so the server compares before freezing.',
  })
  @IsDateString()
  expectedUpdatedAt: string;
}
