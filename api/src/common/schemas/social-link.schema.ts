import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** One `{ platform, url }` entry in a `socialLinks[]` array — shared shape
 *  across `clubs.socialLinks` and `athleteProfiles.socialLinks` on the live
 *  FigJam board, so it lives here rather than being hand-rolled per schema
 *  (same reasoning as `LocalizedText`). Not a standalone collection:
 *  `_id: false`. */
@Schema({ _id: false })
export class SocialLink {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  url: string;
}

export const SocialLinkSchema = SchemaFactory.createForClass(SocialLink);
