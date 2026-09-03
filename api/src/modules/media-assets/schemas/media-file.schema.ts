import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** The `file` embed on `mediaAssets` — `[SCHEMA-READY GAP FILLED]` shape
 *  per the live FigJam board. Not a standalone collection: `_id: false`. */
@Schema({ _id: false })
export class MediaFile {
  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ type: Number, required: true })
  width: number;

  @Prop({ type: Number, required: true })
  height: number;

  @Prop({ type: Number, required: true })
  size: number;
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);
