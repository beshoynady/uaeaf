import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { BaseSchema } from './base.schema.js';
import { LocalizedText, LocalizedTextSchema } from './localized-text.schema.js';

/**
 * The hero-wrapper trio (`heroImageId`, `heroTitle`, `heroSubtitle`)
 * carried verbatim and identically by twelve Domain 1/5/11 listing-page
 * collections: the ten on the live FigJam board (`athletesPage`,
 * `coachesPage`, `resultsRankingsPage`, `recordsPage`, `newsPage`,
 * `clubsPage`, `disciplinesPage`, `boardMembersPage`, `committeesPage`,
 * `contactUsPage`, re-read fresh 2026-09-03), plus `albumsPage`/
 * `videosPage` (added 2026-09-04, same pattern, Domain 5 — Media Center).
 *
 * Extracted here rather than hand-rolled ten times, same reasoning as
 * `LocalizedText`/`SocialLink`. Concrete collections extend this and add
 * their own fields; each still declares its own `@Schema({collection})`.
 */
@Schema()
export abstract class HeroPageSchema extends BaseSchema {
  /**
   * Whether this page is served at its URL at all. `false` shows visitors an
   * "in preparation" page in place of the content, at the same address
   * (ADR-0102 §D2).
   *
   * Operational state, not content: it is changed outside the review cycle,
   * under this page's `Publish` grant, and takes effect at once.
   *
   * ── Why `default: true` ────────────────────────────────────────────────
   *
   * These pages are already live. A new row is a page an editor has just
   * filled in, and there is no state in which the right answer is "saved but
   * withheld by default" — `aboutFederationPage` is the one page for which
   * there was, and it declares its own field at `default: false`.
   *
   * A default does not reach a document that is already stored, so every row
   * written before this field reads back `undefined`. That is what
   * `bootstrap/backfill-page-activation.ts` is for, and it is part of the same
   * change rather than a follow-up (ADR-0102 §D3).
   *
   * ── Why `select: false` ───────────────────────────────────────────────
   *
   * Three of the fifteen collections extending this schema are
   * workflow-governed — `presidentMessagePage`, `visionMissionPage`,
   * `strategicPlansPage`. `RevisionsService.snapshotOf` freezes whatever a
   * plain `.lean()` read returns and `PublishingService.restore` writes a
   * snapshot straight back over the row, so an ordinary field here would mean
   * that restoring last month's wording also restored last month's live state
   * — taking a published page off the site with nobody asking. Both of those
   * are shared workflow core and not ours to special-case, so the exclusion
   * lives on the field (ADR-0102 §D4).
   *
   * Declared once here rather than on the three that need it: a field that is
   * safe on twelve subclasses and unsafe on three is a field whose safety
   * depends on which subclass a later reader happens to open.
   *
   * The two readers that genuinely need it ask by name: the public read, which
   * must know whether to serve the page, and the dashboard, which draws the
   * switch. `BaseRepository.findOneWithActivation` is that read.
   */
  @Prop({ type: Boolean, default: true, select: false })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, ref: 'MediaAsset', default: null })
  heroImageId: Types.ObjectId | null;

  @Prop({ type: LocalizedTextSchema, required: true })
  heroTitle: LocalizedText;

  @Prop({ type: LocalizedTextSchema, required: true })
  heroSubtitle: LocalizedText;
}
