import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';
import { DocumentFile, DocumentFileSchema } from './document-file.schema.js';

export type DocumentDocument = HydratedDocument<Document>;

export const DOCUMENT_TYPES = [
  'GovernancePolicy',
  'Regulation',
  'ConsentForm',
  'Contract',
  'Certificate',
  'MeetingMinutes',
  'Other',
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_OWNER_TYPES = [
  'Club',
  'Athlete',
  'Coach',
  'Official',
  'Championship',
  'Membership',
  'Sponsorship',
] as const;
export type DocumentOwnerType = (typeof DOCUMENT_OWNER_TYPES)[number];

/** @deprecated Use the shared `PUBLICATION_STATES` from
 *  `common/constants/publication-states.ts` — identical 4-value enum,
 *  promoted there in Week 4 once eight more collections needed it. */
export const DOCUMENT_PUBLICATION_STATES = PUBLICATION_STATES;
export type DocumentPublicationState = PublicationState;

/**
 * Implements: documents collection, Domain 6 (FigJam node `94:7374`,
 * re-read fresh 2026-09-03). Two independent usage modes, confirmed
 * decision #6 — modeled as distinct `DocumentsService` methods, not one
 * conflated path:
 *
 * (a) Standalone record: `documents` is already one of Week 2's 13
 * List-A/12 List-B workflow entity types (`common/constants/
 * workflow-entity-types.ts` — no change needed there, it already
 * anticipated this collection). `DocumentsService.getPublicSnapshot()`/
 * `assertHardDeletable()` delegate to `PublicationsService`/
 * `RevisionsService` for this mode.
 *
 * (b) Generic attachment: `ownerType`/`ownerId` (poly, optional —
 * "attachment use only" per the board) let a document be secondary to some
 * other entity (a club's registration certificate, a sponsorship
 * contract) without necessarily going through a full approval cycle.
 * `Championship`/`Membership`/`Sponsorship` are not built this week — the
 * closed `ownerType` enum is still typed per the board, but `ownerId`
 * stays a plain `ObjectId` with no `ref:` to a not-yet-registered model.
 *
 * `expiryDate` carries a documented field-precedence rule (2026-09-01):
 * descriptive/informational only, zero effect on public visibility —
 * visibility is controlled exclusively by `publicationState` +
 * `archivedAt`, never read by any auto-transition/cron job.
 */
@Schema({ collection: 'documents' })
export class Document extends BaseSchema {
  @Prop({ type: DocumentFileSchema, required: true })
  file: DocumentFile;

  @Prop({ type: String, enum: DOCUMENT_TYPES, required: true })
  documentType: DocumentType;

  @Prop({ type: String, enum: DOCUMENT_OWNER_TYPES, default: null })
  ownerType: DocumentOwnerType | null;

  @Prop({ type: Types.ObjectId, default: null })
  ownerId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  effectiveDate: Date;

  @Prop({ type: Date, default: null })
  expiryDate: Date | null;

  @Prop({ type: String, enum: DOCUMENT_PUBLICATION_STATES, required: true })
  publicationState: DocumentPublicationState;
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
DocumentSchema.index({ ownerType: 1, ownerId: 1 });
