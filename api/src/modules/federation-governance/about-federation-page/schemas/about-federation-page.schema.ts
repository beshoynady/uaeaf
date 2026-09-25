import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { HydratedDocument } from 'mongoose';
import { BaseSchema } from '../../../../common/schemas/base.schema.js';
import { PageSeo, PageSeoSchema } from '../../../../common/schemas/page-seo.schema.js';
import { PUBLICATION_STATES } from '../../../../common/constants/publication-states.js';
import type { PublicationState } from '../../../../common/constants/publication-states.js';
import {
  HIDEABLE_SECTION_KEYS,
  HeroSection,
  HeroSectionSchema,
  FactsSection,
  FactsSectionSchema,
  StorySection,
  StorySectionSchema,
  TimelineSection,
  TimelineSectionSchema,
  AchievementsSection,
  AchievementsSectionSchema,
  PioneersSection,
  PioneersSectionSchema,
  LeadershipSection,
  LeadershipSectionSchema,
  GovernanceSection,
  GovernanceSectionSchema,
  EcosystemSection,
  EcosystemSectionSchema,
  CtaSection,
  CtaSectionSchema,
} from './about-sections.schema.js';
import type { HideableSectionKey } from './about-sections.schema.js';

export type AboutFederationPageDocument = HydratedDocument<AboutFederationPage>;

/**
 * Implements: aboutFederationPage collection, Domain 1 — Federation &
 * Governance.
 *
 * Workflow-governed (List A + List B): public reads go through
 * `publications → revisions.snapshotData`, never this row.
 *
 * ── Why the previous shape is gone rather than extended ───────────────────
 *
 * The row used to carry a flat editorial design — `foundingDate`,
 * `historicalIntro`, a first-president block, a bounded `achievements` list —
 * taken from the physical model before the page was composed. That page was
 * never built: `/about` has been served by `PreparingPageScreen` throughout,
 * so no publication exists to strand and no visitor loses anything. Carrying
 * the old fields alongside the new ones would have left fifteen paths no
 * screen writes and no page prints, which every later reader would have to
 * rule out by hand.
 *
 * ── Order is not stored ───────────────────────────────────────────────────
 *
 * `sectionOrder` is deliberately absent (ADR-0101). The printed order carries
 * the identity guide's colour cadence and the sequence the nine scroll scenes
 * are composed against; neither is visible to an editor dragging rows, and
 * both break silently. Visibility *is* stored, for the seven content sections
 * `HIDEABLE_SECTION_KEYS` names.
 */
@Schema({ collection: 'aboutFederationPage', timestamps: true })
export class AboutFederationPage extends BaseSchema {
  /**
   * Whether the finished page is served at all. `false` shows visitors the
   * same "in preparation" screen the route carried before it was built.
   *
   * Operational state, not content: it is changed outside the review cycle,
   * under the Publish grant, and takes effect at once.
   *
   * `select: false` is what keeps it that way. `RevisionsService.snapshotOf`
   * freezes whatever a plain `.lean()` read returns, and
   * `PublishingService.restore` writes a snapshot straight back over the row —
   * so an ordinary field here would mean that restoring last month's wording
   * also restored last month's live/offline state, taking a published page off
   * the site with nobody asking for it. Both of those are shared workflow core
   * and not ours to special-case, so the exclusion lives on the field: readers
   * that want it ask for it by name (`.select('+isActive')`).
   */
  @Prop({ type: Boolean, default: false, select: false })
  isActive: boolean;

  /** Which content sections the editor has switched off. Constrained to
   *  `HIDEABLE_SECTION_KEYS` here and again in the DTO: the schema stops a
   *  direct write, the DTO gives the editor a reason. */
  @Prop({ type: [String], enum: HIDEABLE_SECTION_KEYS, default: [] })
  hiddenSections: HideableSectionKey[];

  @Prop({ type: HeroSectionSchema, required: true })
  hero: HeroSection;

  @Prop({ type: FactsSectionSchema, default: () => ({}) })
  facts: FactsSection;

  @Prop({ type: StorySectionSchema, default: null })
  story: StorySection | null;

  @Prop({ type: TimelineSectionSchema, default: null })
  timeline: TimelineSection | null;

  @Prop({ type: AchievementsSectionSchema, default: null })
  achievements: AchievementsSection | null;

  @Prop({ type: PioneersSectionSchema, default: null })
  pioneers: PioneersSection | null;

  @Prop({ type: LeadershipSectionSchema, default: null })
  leadership: LeadershipSection | null;

  @Prop({ type: GovernanceSectionSchema, default: null })
  governance: GovernanceSection | null;

  @Prop({ type: EcosystemSectionSchema, default: null })
  ecosystem: EcosystemSection | null;

  @Prop({ type: CtaSectionSchema, default: null })
  cta: CtaSection | null;

  @Prop({ type: PageSeoSchema, default: () => ({}) })
  seo: PageSeo;

  /** Denormalized ← `publications` (ADR-0020). */
  @Prop({ type: String, enum: PUBLICATION_STATES, required: true })
  publicationState: PublicationState;
}

export const AboutFederationPageSchema = SchemaFactory.createForClass(AboutFederationPage);
