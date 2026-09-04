import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

export type DisciplineDocument = HydratedDocument<Discipline>;

/** Implements: disciplines collection, Domain 3 (partial — reference data
 *  only; FigJam node `289:4472`, re-read fresh 2026-09-03). Each discipline
 *  is its own browsable category page (Track/Jumps/Throws/Combined/
 *  RoadRunning/RaceWalking/CrossCountry), per World Athletics' official
 *  7-category classification. `slug` and `iconKey` are plain `String` on
 *  the live board — not bilingual, unlike `name`/`description`. */
@Schema({ collection: 'disciplines' })
export class Discipline extends BaseSchema {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ required: true })
  slug: string;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  coverImage: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: Boolean, required: true })
  isInternationallyCertified: boolean;

  @Prop({ required: true })
  iconKey: string;
}

export const DisciplineSchema = SchemaFactory.createForClass(Discipline);
// Partial (not a plain `unique: true` @Prop) so a soft-deleted discipline's
// slug doesn't permanently block a corrected re-creation
// (schema-audit-2026-09-04.md §9.2, P1 finding).
DisciplineSchema.index({ slug: 1 }, { unique: true, partialFilterExpression: { archivedAt: null } });
