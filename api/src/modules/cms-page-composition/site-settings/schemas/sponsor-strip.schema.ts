import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

/** One setting for the whole strip, never per sponsor (ADR-0077 D5 #1). */
export const SPONSOR_STRIP_DISPLAY_MODES = ['logo', 'logoName', 'logoNameScope'] as const;
export type SponsorStripDisplayMode = (typeof SPONSOR_STRIP_DISPLAY_MODES)[number];

export const SPONSOR_STRIP_SELECTIONS = ['allActive', 'manual'] as const;
export type SponsorStripSelection = (typeof SPONSOR_STRIP_SELECTIONS)[number];

export const SPONSOR_STRIP_ORDERS = ['tier', 'manual'] as const;
export type SponsorStripOrder = (typeof SPONSOR_STRIP_ORDERS)[number];

/** Three steps (ADR-0077 D5 #5). */
export const SPONSOR_STRIP_SPEEDS = ['slow', 'medium', 'fast'] as const;
export type SponsorStripSpeed = (typeof SPONSOR_STRIP_SPEEDS)[number];

/**
 * `siteSettings.sponsorStrip` (ADR-0077 D5, ADR-0085 D7).
 *
 * On the site-wide singleton rather than a page section, because ADR-0043
 * makes the strip global chrome that belongs to neither the header nor the
 * footer. A per-page override can later layer on these values without moving a
 * field (D5 #10); nothing here implements one.
 *
 * `pinnedSponsorshipId` holds one chosen sponsorship at the head of the strip
 * (ADR-0086 D2). It replaced `pinTopTier`, which pinned whatever the banner
 * showed; that automatic agreement between the strip and the sponsors section
 * (ADR-0085 D5.1) is withdrawn, and the settings screen names the banner's
 * sponsorship instead so the editor chooses knowing it.
 */
@Schema({ _id: false })
export class SponsorStripSettings {
  @Prop({ type: Boolean, default: true })
  isVisible: boolean;

  @Prop({ type: String, enum: SPONSOR_STRIP_DISPLAY_MODES, default: 'logoName' })
  displayMode: SponsorStripDisplayMode;

  @Prop({ type: String, enum: SPONSOR_STRIP_SELECTIONS, default: 'allActive' })
  selection: SponsorStripSelection;

  /** Read only when `selection` is `manual`, in this order. */
  @Prop({ type: [Types.ObjectId], default: [] })
  sponsorshipIds: Types.ObjectId[];

  @Prop({ type: String, enum: SPONSOR_STRIP_ORDERS, default: 'tier' })
  order: SponsorStripOrder;

  /**
   * The one sponsorship held still at the head of the strip, or `null` when
   * none is (ADR-0086 D2). Replaces `pinTopTier`: the editor chooses which
   * sponsor is held, rather than the tier choosing for them.
   *
   * One nullable id, deliberately — "at most one at a time, and choosing
   * another replaces it" is then the shape of the data rather than a rule
   * something has to enforce. A choice that stops running is not found when
   * the strip is built, so nothing is held and no gap is left.
   */
  @Prop({ type: Types.ObjectId, default: null })
  pinnedSponsorshipId: Types.ObjectId | null;

  @Prop({ type: String, enum: SPONSOR_STRIP_SPEEDS, default: 'medium' })
  speed: SponsorStripSpeed;
}

export const SponsorStripSettingsSchema = SchemaFactory.createForClass(SponsorStripSettings);

/** The strip's settings as a reader receives them: ids as strings. */
export interface SponsorStripSettingsView {
  isVisible: boolean;
  displayMode: SponsorStripDisplayMode;
  selection: SponsorStripSelection;
  sponsorshipIds: string[];
  order: SponsorStripOrder;
  pinnedSponsorshipId: string | null;
  speed: SponsorStripSpeed;
}

/** The owner's defaults, the strip's state before anything is saved. */
export const SPONSOR_STRIP_DEFAULTS: SponsorStripSettingsView = {
  isVisible: true,
  displayMode: 'logoName',
  selection: 'allActive',
  sponsorshipIds: [],
  order: 'tier',
  pinnedSponsorshipId: null,
  speed: 'medium',
};

/** Stored settings, with every missing field taken from the defaults, so a
 *  row written before the strip existed reads exactly as a fresh one. */
export const normalizeSponsorStrip = (stored: Partial<SponsorStripSettings> | null | undefined): SponsorStripSettingsView => ({
  isVisible: stored?.isVisible ?? SPONSOR_STRIP_DEFAULTS.isVisible,
  displayMode: stored?.displayMode ?? SPONSOR_STRIP_DEFAULTS.displayMode,
  selection: stored?.selection ?? SPONSOR_STRIP_DEFAULTS.selection,
  sponsorshipIds: (stored?.sponsorshipIds ?? []).map(String),
  order: stored?.order ?? SPONSOR_STRIP_DEFAULTS.order,
  pinnedSponsorshipId: stored?.pinnedSponsorshipId ? String(stored.pinnedSponsorshipId) : SPONSOR_STRIP_DEFAULTS.pinnedSponsorshipId,
  speed: stored?.speed ?? SPONSOR_STRIP_DEFAULTS.speed,
});
