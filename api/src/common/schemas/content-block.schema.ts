import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { LocalizedText, LocalizedTextSchema } from './localized-text.schema.js';

/**
 * `{ title, description, displayOrder }` — the bounded editorial list item
 * repeated verbatim across four Domain 1 page collections on the live board
 * (`visionMissionPage.strategicGoals`, `strategicPlansPage.strategicAxes`,
 * `strategicPlansPage.objectives`, `presidentMessagePage.goals`, re-read
 * fresh 2026-09-03). Deliberately has NO icon field — the board is explicit
 * that these lists carry no icon, unlike `IconedContentBlock`.
 *
 * These lists are edited and published together with their parent page as
 * one editorial unit; they have no independent revision/publication
 * lifecycle of their own. Not a standalone collection: `_id: false`.
 */
@Schema({ _id: false })
export class ContentBlock {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}

export const ContentBlockSchema = SchemaFactory.createForClass(ContentBlock);

/**
 * `{ title, description, iconKey, displayOrder }` — the icon-bearing
 * variant, used by `visionMissionPage.coreValues` and
 * `strategicPlansPage.foundationPillars`.
 *
 * `iconKey` is a plain string identifier (e.g. a lucide-react icon name)
 * resolved client-side, explicitly NOT a `mediaAssets` ref — the same
 * pattern as `socialLinks.platform`.
 */
@Schema({ _id: false })
export class IconedContentBlock extends ContentBlock {
  @Prop({ type: String, required: true })
  iconKey: string;
}

export const IconedContentBlockSchema = SchemaFactory.createForClass(IconedContentBlock);
