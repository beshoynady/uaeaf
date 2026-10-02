import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

/** One CV line. Each is shown or hidden and ordered on its own, so an
 *  admin can publish part of a record without deleting the rest. Not a
 *  standalone collection: `_id: false`. */
@Schema({ _id: false })
export class CvEntry {
  @Prop({ type: LocalizedTextSchema, required: true })
  text: LocalizedText;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: Number, required: true })
  order: number;
}

export const CvEntrySchema = SchemaFactory.createForClass(CvEntry);

/** A person's public CV: five independently ordered, independently visible
 *  lists. Embedded only, one per `federationPersonnel` row: `_id: false`. */
@Schema({ _id: false })
export class PersonnelCv {
  @Prop({ type: [CvEntrySchema], default: [] })
  qualifications: CvEntry[];

  @Prop({ type: [CvEntrySchema], default: [] })
  certifications: CvEntry[];

  @Prop({ type: [CvEntrySchema], default: [] })
  previousPositions: CvEntry[];

  @Prop({ type: [CvEntrySchema], default: [] })
  experience: CvEntry[];

  @Prop({ type: [CvEntrySchema], default: [] })
  achievements: CvEntry[];
}

export const PersonnelCvSchema = SchemaFactory.createForClass(PersonnelCv);
