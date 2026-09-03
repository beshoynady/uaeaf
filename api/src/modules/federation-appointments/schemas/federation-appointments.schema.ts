import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';

export type FederationAppointmentDocument = HydratedDocument<FederationAppointment>;

export const APPOINTMENT_ROLE_TYPES = [
  'President',
  'BoardMember',
  'CommitteeChair',
  'CommitteeMember',
  'ExecutiveDirector',
  'Manager',
  'Other',
] as const;
export type AppointmentRoleType = (typeof APPOINTMENT_ROLE_TYPES)[number];

export const APPOINTMENT_STATUSES = [
  'Active',
  'Completed',
  'Resigned',
  'Removed',
  'Transitioned',
  'Deceased',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

/** Implements: federationAppointments collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Succession is EXPLICIT (confirmed decision #3): an admin selects
 *  `supersedesAppointmentId`, and the service then closes exactly that
 *  appointment. The board's own wording: "Replaces the earlier implicit
 *  roleType-based auto-close rule, which would have incorrectly closed
 *  unrelated appointments for multi-holder roles (BoardMember,
 *  CommitteeMember) — now every closure is an explicit, auditable admin
 *  decision."
 *
 *  ⚠️ Board inconsistency, flagged not silently resolved: the `status`
 *  field's own note still describes the superseded implicit rule ("adding
 *  a new appointment for the same roleType+scope auto-closes the previous
 *  active one"). That text contradicts the `supersedesAppointmentId` note
 *  above it and is treated here as stale — the explicit pointer wins, per
 *  decision #3 and the later-dated correction it records. No
 *  roleType-based auto-close is implemented.
 *
 *  Not workflow-governed: no `publicationState`; absent from both Domain 7
 *  closed lists. */
@Schema({ collection: 'federationAppointments' })
export class FederationAppointment extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'FederationPersonnel', required: true })
  personId: Types.ObjectId;

  /** Self-reference: the specific prior appointment this one succeeds.
   *  Optional — a first-ever appointment supersedes nothing. */
  @Prop({ type: Types.ObjectId, ref: 'FederationAppointment', default: null })
  supersedesAppointmentId: Types.ObjectId | null;

  @Prop({ type: String, enum: APPOINTMENT_ROLE_TYPES, required: true })
  roleType: AppointmentRoleType;

  /** Free text, e.g. "نائب الرئيس" — the specific title within roleType. */
  @Prop({ type: LocalizedTextSchema, required: true })
  positionTitle: LocalizedText;

  /** Populated only for CommitteeChair/CommitteeMember roleTypes. The
   *  board states no schema-level conditional requirement, so none is
   *  enforced here. */
  @Prop({ type: Types.ObjectId, ref: 'Committee', default: null })
  committeeId: Types.ObjectId | null;

  /** Populated for President and BoardMember roleTypes (both elected by
   *  the same cycle). */
  @Prop({ type: Types.ObjectId, ref: 'ElectionCycle', default: null })
  electionCycleId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  termStart: Date;

  /** Null while the appointment is ongoing. */
  @Prop({ type: Date, default: null })
  termEnd: Date | null;

  @Prop({ type: String, enum: APPOINTMENT_STATUSES, required: true })
  status: AppointmentStatus;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}

export const FederationAppointmentSchema = SchemaFactory.createForClass(FederationAppointment);
