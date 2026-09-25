import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { LocalizedText, LocalizedTextSchema } from '../../../../common/schemas/localized-text.schema.js';

/**
 * The ten sections of the approved About page, as stored.
 *
 * Section ORDER is not stored. It is fixed in the page's own code because it
 * carries two things an editor cannot see while reordering: the colour cadence
 * the identity guide sets (ink, paper, green, red), and the sequence the nine
 * scroll scenes are composed against. Section VISIBILITY is stored, for the
 * seven content sections only (ADR-0101).
 *
 * Every list item is a subdocument with its own `_id`, so reordering never
 * changes which item is which, and carries `isVisible`/`displayOrder` — the
 * two names every other embedded list in this codebase already uses.
 */

/** In printed order. The public page renders exactly this sequence. */
export const ABOUT_SECTION_KEYS = [
  'hero',
  'facts',
  'story',
  'timeline',
  'achievements',
  'pioneers',
  'leadership',
  'governance',
  'ecosystem',
  'cta',
] as const;
export type AboutSectionKey = (typeof ABOUT_SECTION_KEYS)[number];

/**
 * What an editor may switch off (ADR-0101).
 *
 * `hero` is absent because a page with no header is not a page. `leadership`
 * and `ecosystem` are absent because they are drawn from the board module and
 * from record counts: they answer to whether their source has anything to say,
 * which is a fact about the data and not a preference.
 */
export const HIDEABLE_SECTION_KEYS = [
  'facts',
  'story',
  'timeline',
  'achievements',
  'pioneers',
  'governance',
  'cta',
] as const;
export type HideableSectionKey = (typeof HIDEABLE_SECTION_KEYS)[number];

/**
 * How much of a milestone's date the federation has actually confirmed.
 *
 * `unknown` is a real state, not a missing value: the Basra championship is
 * documented but undated, and the federation would rather hold it than print a
 * guessed year. A milestone at `unknown` is withheld from the public page
 * whatever its own visibility switch says.
 */
export const DATE_PRECISIONS = ['year', 'monthYear', 'fullDate', 'unknown'] as const;
export type DatePrecision = (typeof DATE_PRECISIONS)[number];

/** The closed list the approved milestone editor draws as a select. Labels are
 *  bilingual copy in the message catalogues, not editor-typed text. */
export const MILESTONE_CATEGORIES = [
  'association',
  'firstLeadership',
  'firstParticipation',
  'federation',
  'globalMembership',
  'continentalMembership',
] as const;
export type MilestoneCategory = (typeof MILESTONE_CATEGORIES)[number];

export const MEDAL_KINDS = ['gold', 'silver', 'bronze', 'other'] as const;
export type MedalKind = (typeof MEDAL_KINDS)[number];

/** Which identity colour a fact card's edge and number take. `tri` is the
 *  full three-colour edge, used once per the approved composition. */
export const FACT_TONES = ['green', 'black', 'red', 'tri'] as const;
export type FactTone = (typeof FACT_TONES)[number];

/** The governance cards reuse the same three-colour vocabulary, minus `tri`:
 *  the approved composition tints one card each. */
export const CARD_TONES = ['green', 'black', 'red'] as const;
export type CardTone = (typeof CARD_TONES)[number];

@Schema({ _id: false })
export class MediaLink {
  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;

  @Prop({ type: String, required: true })
  href: string;
}
export const MediaLinkSchema = SchemaFactory.createForClass(MediaLink);

// ── Section 1: hero ────────────────────────────────────────────────────────

@Schema({ _id: false })
export class HeroSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageId: Types.ObjectId | null;
}
export const HeroSectionSchema = SchemaFactory.createForClass(HeroSection);

// ── Section 2: facts ───────────────────────────────────────────────────────

/** `value` is text, not a number: the card prints "1974" but the federation
 *  may later want "+50", and a number type would make that a schema change. */
@Schema()
export class Fact {
  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: LocalizedTextSchema, required: true })
  badge: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;

  @Prop({ type: String, enum: FACT_TONES, required: true })
  tone: FactTone;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}
export const FactSchema = SchemaFactory.createForClass(Fact);

@Schema({ _id: false })
export class FactsSection {
  @Prop({ type: [FactSchema], default: [] })
  items: Fact[];
}
export const FactsSectionSchema = SchemaFactory.createForClass(FactsSection);

// ── Section 3: story ───────────────────────────────────────────────────────

/** The dark card over the archive photograph. */
@Schema({ _id: false })
export class StoryDocCard {
  @Prop({ type: LocalizedTextSchema, required: true })
  label: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  date: LocalizedText;
}
export const StoryDocCardSchema = SchemaFactory.createForClass(StoryDocCard);

/**
 * `paragraphs` is a plain list of bilingual strings, not rich text and not a
 * reorderable list of subdocuments. The approved editor gives it two textareas
 * per language and a note that `**text**` reads as emphasis; anything more
 * would be a second rich-text system beside the newsroom's.
 */
@Schema({ _id: false })
export class StorySection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: [LocalizedTextSchema], default: [] })
  paragraphs: LocalizedText[];

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageId: Types.ObjectId | null;

  @Prop({ type: StoryDocCardSchema, required: true })
  docCard: StoryDocCard;
}
export const StorySectionSchema = SchemaFactory.createForClass(StorySection);

// ── Section 4: timeline ────────────────────────────────────────────────────

@Schema()
export class Milestone {
  @Prop({ type: String, enum: DATE_PRECISIONS, required: true })
  datePrecision: DatePrecision;

  /** Present according to `datePrecision`; the DTO enforces which. Stored
   *  loosely so lowering a milestone's precision never has to erase a part the
   *  editor may raise it back to. */
  @Prop({ type: Number, default: null })
  year: number | null;

  @Prop({ type: Number, default: null })
  month: number | null;

  @Prop({ type: Number, default: null })
  day: number | null;

  @Prop({ type: String, enum: MILESTONE_CATEGORIES, required: true })
  category: MilestoneCategory;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  /** The dark card in the approved composition — the founding of the
   *  federation itself. */
  @Prop({ type: Boolean, default: false })
  featured: boolean;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageId: Types.ObjectId | null;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}
export const MilestoneSchema = SchemaFactory.createForClass(Milestone);

@Schema({ _id: false })
export class TimelineSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: [MilestoneSchema], default: [] })
  items: Milestone[];
}
export const TimelineSectionSchema = SchemaFactory.createForClass(TimelineSection);

// ── Section 5: achievements ────────────────────────────────────────────────

@Schema()
export class Achievement {
  @Prop({ type: Number, required: true })
  year: number;

  @Prop({ type: LocalizedTextSchema, required: true })
  place: LocalizedText;

  @Prop({ type: String, enum: MEDAL_KINDS, required: true })
  medalKind: MedalKind;

  /** What the badge prints when the kind alone cannot say it — "5 golds".
   *  Null means the kind's own bilingual label is printed. */
  @Prop({ type: LocalizedTextSchema, default: null })
  medalLabel: LocalizedText | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  /** Optional link to the athlete's own record, where one exists. Editorial
   *  content stays here either way: this is a card about a moment, not a
   *  projection of a profile. */
  @Prop({ type: Types.ObjectId, ref: 'Athlete', default: null })
  athleteId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageId: Types.ObjectId | null;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}
export const AchievementSchema = SchemaFactory.createForClass(Achievement);

@Schema({ _id: false })
export class AchievementsSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: [AchievementSchema], default: [] })
  items: Achievement[];
}
export const AchievementsSectionSchema = SchemaFactory.createForClass(AchievementsSection);

// ── Section 6: pioneers ────────────────────────────────────────────────────

@Schema()
export class Pioneer {
  @Prop({ type: LocalizedTextSchema, required: true })
  name: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  badge: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  imageId: Types.ObjectId | null;

  /** The wide card in the approved composition. At most one, enforced by the
   *  DTO and by the editor. */
  @Prop({ type: Boolean, default: false })
  featured: boolean;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}
export const PioneerSchema = SchemaFactory.createForClass(Pioneer);

@Schema({ _id: false })
export class PioneersSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: [PioneerSchema], default: [] })
  items: Pioneer[];
}
export const PioneersSectionSchema = SchemaFactory.createForClass(PioneersSection);

// ── Section 7: leadership ──────────────────────────────────────────────────

/**
 * Only the editorial half is stored. The president, the board and their
 * portraits are read from `federationAppointments` at request time: a name
 * copied here would be a second place to correct after an election.
 */
@Schema({ _id: false })
export class LeadershipSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  quote: LocalizedText;

  @Prop({ type: [LocalizedTextSchema], default: [] })
  priorities: LocalizedText[];
}
export const LeadershipSectionSchema = SchemaFactory.createForClass(LeadershipSection);

// ── Section 8: governance ──────────────────────────────────────────────────

@Schema()
export class GovernanceCard {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  text: LocalizedText;

  @Prop({ type: String, enum: CARD_TONES, required: true })
  tone: CardTone;

  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: Number, required: true })
  displayOrder: number;
}
export const GovernanceCardSchema = SchemaFactory.createForClass(GovernanceCard);

@Schema({ _id: false })
export class GovernanceSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: [GovernanceCardSchema], default: [] })
  cards: GovernanceCard[];

  @Prop({ type: MediaLinkSchema, required: true })
  link: MediaLink;
}
export const GovernanceSectionSchema = SchemaFactory.createForClass(GovernanceSection);

// ── Section 9: ecosystem ───────────────────────────────────────────────────

/**
 * Its heading is editorial copy like any other; its numbers are not stored at
 * all. The counts come from the record collections at request time, and the
 * node links are the site's own routes, labelled from the navigation
 * catalogue.
 */
@Schema({ _id: false })
export class EcosystemSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  eyebrow: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;
}
export const EcosystemSectionSchema = SchemaFactory.createForClass(EcosystemSection);

// ── Section 10: cta ────────────────────────────────────────────────────────

@Schema({ _id: false })
export class CtaSection {
  @Prop({ type: LocalizedTextSchema, required: true })
  title: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  description: LocalizedText;

  @Prop({ type: MediaLinkSchema, required: true })
  primary: MediaLink;

  @Prop({ type: MediaLinkSchema, required: true })
  secondary: MediaLink;
}
export const CtaSectionSchema = SchemaFactory.createForClass(CtaSection);
