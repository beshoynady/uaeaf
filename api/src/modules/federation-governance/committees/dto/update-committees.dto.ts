import { PartialType } from '@nestjs/swagger';
import { CreateCommitteeDto } from './create-committees.dto.js';

/** Request body for PATCH /committees/:id. Every field optional; omitting
 *  one leaves it unchanged.
 *
 *  Writes the draft row directly, same as `ArticlesService.update()` —
 *  `committees` is workflow-governed (List A/B), but a revision is a
 *  snapshot `RevisionsService`/`PublishingService` freeze at submit/publish
 *  time, not something an ordinary field edit creates (confirmed against
 *  `articles.service.ts`, which saves its own draft the same way). */
export class UpdateCommitteeDto extends PartialType(CreateCommitteeDto, { skipNullProperties: false }) {}
