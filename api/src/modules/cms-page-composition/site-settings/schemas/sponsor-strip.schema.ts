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
 * `pinTopTier` pins the highest tier present, the same tier the banner takes
 * (ADR-0085 D5.1) — not a fixed "strategic".
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

  @Prop({ type: Boolean, default: true })
  pinTopTier: boolean;

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
  pinTopTier: boolean;
  speed: SponsorStripSpeed;
}

/** The owner's defaults, the strip's state before anything is saved. */
export const SPONSOR_STRIP_DEFAULTS: SponsorStripSettingsView = {
  isVisible: true,
  displayMode: 'logoName',
  selection: 'allActive',
  sponsorshipIds: [],
  order: 'tier',
  pinTopTier: true,
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
  pinTopTier: stored?.pinTopTier ?? SPONSOR_STRIP_DEFAULTS.pinTopTier,
  speed: stored?.speed ?? SPONSOR_STRIP_DEFAULTS.speed,
});
