import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';
import { CommitteeDuty, CommitteeDutySchema } from './committee-duty.schema.js';
import { FormationDecision, FormationDecisionSchema } from './formation-decision.schema.js';

export type CommitteeDocument = HydratedDocument<Committee>;

export const COMMITTEE_TYPES = ['Technical', 'Administrative', 'Disciplinary', 'Judging', 'Other'] as const;
export type CommitteeType = (typeof COMMITTEE_TYPES)[number];

export const COMMITTEE_GROUPS = ['Leadership', 'Specialized'] as const;
export type CommitteeGroup = (typeof COMMITTEE_GROUPS)[number];

/** The two shapes a committee's place in the hierarchy may take. Fixed by the
 *  approved model, not admin-entered data — only a committee's own
 *  classification and parent are admin-controlled. */
export const COMMITTEE_KINDS = ['standing', 'sub'] as const;
export type CommitteeKind = (typeof COMMITTEE_KINDS)[number];

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
@Schema({ collection: 'committees', timestamps: true })
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

  @Prop({ type: String, required: true })
  slug: string;

  @Prop({ type: LocalizedTextSchema, default: null })
  summary: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, default: null })
  about: LocalizedText | null;

  @Prop({ type: [CommitteeDutySchema], default: [] })
  duties: CommitteeDuty[];

  @Prop({ type: FormationDecisionSchema, default: null })
  formationDecision: FormationDecision | null;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Document' }], default: [] })
  documentIds: Types.ObjectId[];

  /** The admin's own show/hide switch. Separate from `isActive`, which the
   *  2026-09-01 rule above keeps descriptive, and from `publicationState`,
   *  which remains the approvals engine's gate (ADR-0020, ADR-0125). */
  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  /** Null until an admin classifies the committee; the dashboard lists such
   *  rows under "not yet classified" and the pre-publish check refuses them. */
  @Prop({ type: String, enum: COMMITTEE_KINDS, default: null })
  kind: CommitteeKind | null;

  /** Set only on a sub-committee. Null there means it follows the board. */
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Committee', default: null })
  parentCommitteeId: Types.ObjectId | null;
}

export const CommitteeSchema = SchemaFactory.createForClass(Committee);
