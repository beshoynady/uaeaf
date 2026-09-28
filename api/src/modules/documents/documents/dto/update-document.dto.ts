import { PartialType } from '@nestjs/swagger';
import { CreateDocumentDto } from './create-document.dto.js';

/** Request body for PATCH /documents/:id. Every field optional; omitting
 *  one leaves it unchanged.
 *
 *  Writes the row directly, same as `ArticlesService.update()` —
 *  `documents` is workflow-governed (List A/B), but a revision is a
 *  snapshot taken at submit/publish time, not something an ordinary field
 *  edit creates. */
export class UpdateDocumentDto extends PartialType(CreateDocumentDto, { skipNullProperties: false }) {}
