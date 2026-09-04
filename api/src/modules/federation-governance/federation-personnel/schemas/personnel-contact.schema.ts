import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** `federationPersonnel.publicContact` — `[PUBLIC]` official public-facing
 *  contact only. Not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class PersonnelPublicContact {
  @Prop({ type: String, default: null })
  email: string | null;

  @Prop({ type: String, default: null })
  phone: string | null;
}

export const PersonnelPublicContactSchema = SchemaFactory.createForClass(PersonnelPublicContact);

/** `federationPersonnel.internalContact` — `[RESTRICTED]`: admin/dashboard
 *  only, never exposed publicly. Structurally excluded from
 *  `FederationPersonnelPublicResponseDto`, the same discipline applied to
 *  `athleteProfiles.restricted` in Week 3. */
@Schema({ _id: false })
export class PersonnelInternalContact {
  @Prop({ type: String, default: null })
  personalEmail: string | null;

  @Prop({ type: String, default: null })
  idNumber: string | null;
}

export const PersonnelInternalContactSchema = SchemaFactory.createForClass(PersonnelInternalContact);
