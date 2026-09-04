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

  /** The file's original upload filename, kept for display/download
   *  purposes — independent of `url`/`storageKey`, which are storage
   *  locations, not human-facing names (2026-09-04 media-gallery
   *  hardening pass). */
  @Prop({ required: true, trim: true })
  originalName: string;

  /** The storage-backend-relative path/key (e.g. an S3 object key),
   *  independent of `url`. `url` is what gets served today; `storageKey`
   *  is what a future storage-provider migration (local → S3/R2/MinIO)
   *  would actually move/rewrite — keeping them separate now means that
   *  migration won't require a schema change later. */
  @Prop({ required: true })
  storageKey: string;

  /** Content hash (e.g. SHA-256) of the file bytes, for future integrity
   *  verification/dedup use. `null` until a hashing step exists in the
   *  upload path — not computed in this pass (see
   *  `docs/audits/media-gallery-open-decisions.md`). */
  @Prop({ type: String, default: null })
  checksum: string | null;
}

export const MediaFileSchema = SchemaFactory.createForClass(MediaFile);
