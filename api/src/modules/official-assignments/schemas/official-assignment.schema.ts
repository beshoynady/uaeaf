import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../common/schemas/base.schema.js';
import { OFFICIAL_ROLE_TYPES } from '../../../common/constants/official-role-types.js';
import type { OfficialRoleType } from '../../../common/constants/official-role-types.js';

export type OfficialAssignmentDocument = HydratedDocument<OfficialAssignment>;

export const OFFICIAL_ASSIGNMENT_TARGET_TYPES = ['Championship', 'ChampionshipEvent'] as const;
export type OfficialAssignmentTargetType = (typeof OFFICIAL_ASSIGNMENT_TARGET_TYPES)[number];

/** Implements: officialAssignments collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6340`, re-read fresh 2026-09-03;
 *  `role` added 2026-09-03). `officialId` works uniformly for both
 *  `residencyType=Local` and `Guest` officials, since both live in the
 *  same `officials` collection. `targetId` poly-refs
 *  `championships`/`championshipEvents` — neither is built this week
 *  (Domain 3's championship collections are explicitly out of scope), so
 *  it stays a plain `ObjectId` with no `ref:` to a not-yet-registered
 *  model, matching the established pattern for poly fields pointing at
 *  not-yet-built collections (e.g. Week 2's `notifications.triggerId`).
 *
 *  `role` is the SPECIFIC role for this one assignment, set independently
 *  per match/event — distinct from `officials.roleType` (the official's
 *  general qualification). The same official may be assigned a different
 *  `role` on different assignments; the two fields deliberately share the
 *  same enum but are never derived from one another. */
@Schema({ collection: 'officialAssignments' })
export class OfficialAssignment extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Official', required: true })
  officialId: Types.ObjectId;

  @Prop({ type: String, enum: OFFICIAL_ROLE_TYPES, required: true })
  role: OfficialRoleType;

  @Prop({ type: String, enum: OFFICIAL_ASSIGNMENT_TARGET_TYPES, required: true })
  targetType: OfficialAssignmentTargetType;

  @Prop({ type: Types.ObjectId, required: true })
  targetId: Types.ObjectId;
}

export const OfficialAssignmentSchema = SchemaFactory.createForClass(OfficialAssignment);
