import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseSchema } from './base.schema.js';
import { LocalizedText, LocalizedTextSchema } from './localized-text.schema.js';

/**
 * The hero-wrapper trio (`heroImageId`, `heroTitle`, `heroSubtitle`)
 * carried verbatim and identically by ten Domain 1/11 listing-page
 * collections on the live FigJam board (`athletesPage`, `coachesPage`,
 * `resultsRankingsPage`, `recordsPage`, `newsPage`, `clubsPage`,
 * `disciplinesPage`, `boardMembersPage`, `committeesPage`,
 * `contactUsPage`, re-read fresh 2026-09-03).
 *
 * Extracted here rather than hand-rolled ten times, same reasoning as
 * `LocalizedText`/`SocialLink`. Concrete collections extend this and add
 * their own fields; each still declares its own `@Schema({collection})`.
 */
@Schema()
export abstract class HeroPageSchema extends BaseSchema {
  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  heroImageId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  heroTitle: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  heroSubtitle: LocalizedText;
}
