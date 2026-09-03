import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { PUBLICATION_STATES } from '../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../common/constants/publication-states.js';

export type CommitteeDocument = HydratedDocument<Committee>;

export const COMMITTEE_TYPES = ['Technical', 'Administrative', 'Disciplinary', 'Judging', 'Other'] as const;
export type CommitteeType = (typeof COMMITTEE_TYPES)[number];

export const COMMITTEE_GROUPS = ['Leadership', 'Specialized'] as const;
export type CommitteeGroup = (typeof COMMITTEE_GROUPS)[number];

/** Implements: committees collection, Domain 1 — Federation & Governance
 *  (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed: `committees` is one of the 13 List-A entity types and
 *  the 12 List-B types (domain note `100:7435`, re-verified verbatim this
 *  week), so its public read path goes through
 *  `publications → revisions.snapshotData`, never this row directly.
 *  The board's rationale for including it: "committee descriptions are
 *  genuinely editorial narrative content."
 *
 *  FIELD PRECEDENCE RULE (2026-09-01 board decision, implemented as
 *  stated): `isActive` is descriptive/informational ONLY. It has NO effect
 *  on public visibility and is never auto-synced with `publicationState`
 *  or `archivedAt` — visibility is controlled exclusively by
 *  `publicationState` (and `archivedAt` for record-level soft delete).
 *  No service logic here reads or writes `isActive` off the back of the
 *  other two; all three are independently admin-controlled, deliberately,
 *  to avoid silent state drift.
 *
 *  `committeeGroup` is manually set by an admin — the board notes the
 *  grouping business rule is unconfirmed by the client and deliberately
 *  kept flexible, so nothing is auto-derived here. */
@Schema({ collection: 'committees' })
export class Committee extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  /** Descriptive badge only — see the FIELD PRECEDENCE RULE above. */
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: String, enum: COMMITTEE_TYPES, required: true })
  committeeType: CommitteeType;

  @Prop({ type: String, enum: COMMITTEE_GROUPS, required: true })
  committeeGroup: CommitteeGroup;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const CommitteeSchema = SchemaFactory.createForClass(Committee);
