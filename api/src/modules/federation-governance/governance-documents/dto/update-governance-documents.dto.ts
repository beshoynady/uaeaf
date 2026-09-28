import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateGovernanceDocumentDto } from './create-governance-documents.dto.js';

/**
 * Request body for PATCH /governance-documents/:id. Every field optional;
 * omitting one leaves it unchanged.
 *
 * Writes the row directly, same as `ArticlesService.update()` —
 * `governanceDocuments` is workflow-governed (List A/B), but a revision is
 * a snapshot taken at submit/publish time, not something an ordinary field
 * edit creates.
 *
 * `fileId` is omitted rather than made optional (CLAUDE.md §31 point 2 —
 * prefer the unsafe state unreachable). `create()` checks the referenced
 * `documents` row exists before writing; re-pointing a governance document
 * at a different file is a re-linking operation, not a metadata edit, and
 * without that same check a patch could point this row at a document that
 * does not exist. The global `ValidationPipe` (`whitelist: true,
 * forbidNonWhitelisted: true`) refuses a body carrying `fileId` outright.
 */
export class UpdateGovernanceDocumentDto extends PartialType(
  OmitType(CreateGovernanceDocumentDto, ['fileId'] as const),
  { skipNullProperties: false },
) {}
