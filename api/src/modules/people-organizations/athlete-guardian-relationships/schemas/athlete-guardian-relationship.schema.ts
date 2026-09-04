import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';
import { GuardianContact, GuardianContactSchema } from './guardian-contact.schema.js';

export type AthleteGuardianRelationshipDocument = HydratedDocument<AthleteGuardianRelationship>;

export const GUARDIAN_RELATIONSHIP_TYPES = ['Parent', 'LegalGuardian', 'Other'] as const;
export type GuardianRelationshipType = (typeof GUARDIAN_RELATIONSHIP_TYPES)[number];

/** Implements: athleteGuardianRelationships collection, Domain 2 — People &
 *  Organizations (FigJam node `80:6088`, re-read fresh 2026-09-03). The
 *  guardian is captured directly on the relationship row — there is no
 *  standalone Guardian collection. `consentDocId` refs `documents` (built
 *  this same week, Domain 6). */
@Schema({ collection: 'athleteGuardianRelationships' })
export class AthleteGuardianRelationship extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'Athlete', required: true })
  athleteId: Types.ObjectId;

  @Prop({ type: LocalizedTextSchema, required: true })
  guardianName: LocalizedText;

  @Prop({ type: String, enum: GUARDIAN_RELATIONSHIP_TYPES, required: true })
  relationshipType: GuardianRelationshipType;

  @Prop({ type: GuardianContactSchema, required: true })
  guardianContact: GuardianContact;

  @Prop({ type: Types.ObjectId, ref: 'Document', default: null })
  consentDocId: Types.ObjectId | null;

  @Prop({ type: Date, required: true })
  consentDate: Date;

  @Prop({ type: Boolean, required: true })
  isActive: boolean;
}

export const AthleteGuardianRelationshipSchema = SchemaFactory.createForClass(AthleteGuardianRelationship);
