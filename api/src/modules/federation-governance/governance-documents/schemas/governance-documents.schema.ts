import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';

export type GovernanceDocumentDocument = HydratedDocument<GovernanceDocument>;

/** From the live page design's own filter tabs
 *  (اللوائح/السياسات/النماذج/الأدلة/القرارات). */
export const GOVERNANCE_DOCUMENT_TYPES = ['Regulation', 'Policy', 'Form', 'Guide', 'Decision'] as const;
export type GovernanceDocumentType = (typeof GOVERNANCE_DOCUMENT_TYPES)[number];

/** Implements: governanceDocuments collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`.
 *
 *  WORKFLOW COORDINATION RULE (2026-09-01 board decision, confirmed
 *  decision #5): this wrapper entity is the sole workflow authority.
 *  Approving/publishing THIS record is sufficient on its own — the
 *  referenced `documents` row does NOT run its own
 *  Draft→Review→Approve→Publish cycle here; it is an attached file, not a
 *  co-equal governed entity. A new file upload should therefore produce a
 *  new revision of this wrapper, never a separate documents-side approval.
 *  `GovernanceDocumentsService` deliberately calls no workflow method on
 *  `DocumentsService`. */
@Schema({ collection: 'governanceDocuments' })
export class GovernanceDocument extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  /** Short description shown under the document title on each card. */
  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: String, enum: GOVERNANCE_DOCUMENT_TYPES, required: true })
  type: GovernanceDocumentType;

  /** ref → documents (1:1). `documents.file` holds both EN/AR variants
   *  internally (Domain 6), so there is no second file field here. */
  @Prop({ type: Types.ObjectId, ref: 'Document', required: true })
  fileId: Types.ObjectId;

  /** e.g. "1.0", "2.1" — same field name/pattern as
   *  `strategicPlansPage.documentVersion`, for consistency. */
  @Prop({ type: String, required: true })
  documentVersion: string;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const GovernanceDocumentSchema = SchemaFactory.createForClass(GovernanceDocument);
