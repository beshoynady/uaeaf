import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type ClubTeamDocument = HydratedDocument<ClubTeam>;

export const CLUB_TEAM_GENDERS = ['Male', 'Female', 'Mixed'] as const;
export type ClubTeamGender = (typeof CLUB_TEAM_GENDERS)[number];

/** Implements: clubTeams collection, Domain 2 — People & Organizations
 *  (FigJam node `261:4352`, re-read fresh 2026-09-03). A squad — e.g. "First
 *  Team (Men)" — within a club, scoped to one age category and gender. */
@Schema({ collection: 'clubTeams' })
export class ClubTeam extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'AgeCategory', required: true })
  ageCategoryId: Types.ObjectId;

  @Prop({ type: String, enum: CLUB_TEAM_GENDERS, required: true })
  gender: ClubTeamGender;

  @Prop({ type: [Types.ObjectId], ref: 'Athlete', default: [] })
  athleteIds: Types.ObjectId[];
}

export const ClubTeamSchema = SchemaFactory.createForClass(ClubTeam);
