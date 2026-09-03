import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../common/schemas/localized-text.schema.js';
import { PUBLICATION_STATES } from '../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../common/constants/publication-states.js';

export type OrganizationalStructureNodeDocument = HydratedDocument<OrganizationalStructureNode>;

/** Verbatim from the board, including the space in "General Assembly". */
export const ORG_NODE_TYPES = [
  'General Assembly',
  'Board',
  'Committee',
  'Executive',
  'Department',
] as const;
export type OrgNodeType = (typeof ORG_NODE_TYPES)[number];

/** Implements: organizationalStructure collection, Domain 1 — Federation &
 *  Governance (live FigJam Physical Model, re-read fresh 2026-09-03).
 *
 *  Workflow-governed (List A + List B): public reads go through
 *  `publications → revisions.snapshotData`.
 *
 *  Confirmed decision #2: there is NO `departmentId` — the `departments`
 *  collection was removed from the board entirely on 2026-09-02, and a
 *  `nodeType='Department'` row here IS the department record. No
 *  `departments` module is built.
 *
 *  ⚠️ Board inconsistency, flagged not silently resolved: the `nodeType`
 *  note still reads "resolved via committeeId/departmentId or the optional
 *  federationAppointmentId", but neither `committeeId` nor `departmentId`
 *  appears in the collection's own field list — only
 *  `federationAppointmentId` does. Implemented exactly to the field list;
 *  the note's first two references are treated as stale text left over
 *  from before the 2026-09-02 removal.
 *
 *  `parentNodeId` builds the org tree. Mongoose enforces nothing about
 *  cycles, so `OrganizationalStructureNodesService.setParent()` walks the
 *  ancestor chain and rejects any edit that would close a loop. */
@Schema({ collection: 'organizationalStructure' })
export class OrganizationalStructureNode extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'OrganizationalStructureNode', default: null })
  parentNodeId: Types.ObjectId | null;

  @Prop({ type: Number, required: true })
  displayOrder: number;

  @Prop({ type: String, enum: ORG_NODE_TYPES, required: true })
  nodeType: OrgNodeType;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;

  /** Optional, for standalone nodes not tied to a committee or department
   *  (e.g. "Office of the Director General"). */
  @Prop({ type: Types.ObjectId, ref: 'FederationAppointment', default: null })
  federationAppointmentId: Types.ObjectId | null;
}

export const OrganizationalStructureNodeSchema = SchemaFactory.createForClass(
  OrganizationalStructureNode,
);
