/**
 * The closed set of icon identifiers a values list may name (ADR-0069 D2,
 * owner decision Q14).
 *
 * `IconedContentBlock.iconKey` is a free string. A free string is how the
 * approved Figma frames ended up carrying five icon hues from outside the
 * identity palette (defect PM-D23) — nothing refused them. This enum is the
 * refusal.
 *
 * The first five are the keys the frames already use. The other seven are
 * the plausible neighbours for a governance page, chosen so that a future
 * message can say something ordinary without a schema change. Colour is not
 * one of the choices: every icon takes the one green chip treatment
 * (ADR-0066 D3).
 *
 * Delivery is vendored SVG, not a runtime icon dependency — ADR-0065 D6's
 * threshold is not met by a set of twelve static glyphs.
 */
export const VALUE_ICON_KEYS = [
  'eye',
  'users',
  'star',
  'award',
  'zap',
  'target',
  'handshake',
  'trophy',
  'medal',
  'flag',
  'lightbulb',
  'shield-check',
] as const;

export type ValueIconKey = (typeof VALUE_ICON_KEYS)[number];
