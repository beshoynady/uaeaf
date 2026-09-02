import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/**
 * Fields shared by every collection on the live FigJam Physical Model:
 * createdAt/updatedAt (auto-managed by Mongoose `timestamps`), createdBy/
 * updatedBy (ref -> users, optional), and soft delete via archivedAt/
 * archivedBy rather than physical deletion — see BE-PLAN-010 §4.1.
 */
@Schema({
  timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
})
export abstract class BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  updatedBy: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  archivedAt: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  archivedBy: Types.ObjectId | null;
}
