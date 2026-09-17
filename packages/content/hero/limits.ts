/**
 * What an editor writes within, and the playback an editor chooses from.
 *
 * The text limits were measured, not assumed (progress log §٢٧.٣): the longest
 * text that stays within each field's line budget at 390px, with the site's own
 * elements, fonts and column width, the smaller of Arabic and English. The API
 * refuses longer text (`heroTextTooLong`) and the dashboard counts towards the
 * same numbers.
 */
export const HERO_TEXT_LIMITS = {
  /** One line. */
  eyebrow: 52,
  /** Two lines. */
  title: 44,
  /** Three lines. */
  subtitle: 116,
  /** One line. */
  eventName: 52,
  /** One line. */
  eventLabel: 52,
  /** One line, after the date and time. */
  eventVenue: 35,
} as const;

/** A button label that fits the button at 390px (`hero-cta.schema.ts`). */
export const HERO_CTA_LABEL_MAX = 32;

/**
 * The slide durations offered, each including the transition (owner decision
 * 2026-09-16: "the slide's time includes the transition"). Three values rather
 * than a free number: no design token defines a slide dwell, so the choice is
 * bounded to durations measured to leave at least five seconds of reading at
 * the default, and never less than 3.5 seconds at the shortest.
 */
export const HERO_PLAYBACK = {
  intervals: [5000, 7000, 9000] as readonly number[],
  defaultIntervalMs: 7000,
  /** The longest transition under comparison (ADR-0076 D8.2). */
  transitionMs: 1200,
};

/** Characters as a reader counts them: grapheme clusters, ends trimmed. */
export const graphemeLength = (text: string): number => {
  const trimmed = text.trim();
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(trimmed)].length;
  }
  return [...trimmed].length;
};

/** An internal path: one leading slash, never two (a protocol-relative URL). */
export const isInternalHeroUrl = (url: string): boolean => /^\/(?!\/)/.test(url);

/** A button link the site will draw: an internal path or an absolute https URL. */
export const isUsableHeroUrl = (url: string): boolean => {
  if (isInternalHeroUrl(url)) return true;
  if (!url.startsWith("https://")) return false;
  try {
    return Boolean(new URL(url).hostname);
  } catch {
    return false;
  }
};
