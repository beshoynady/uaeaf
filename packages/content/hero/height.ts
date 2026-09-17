/**
 * The first screen (ADR-0078): the header plus the hero is the reader's screen,
 * and the hero's content is the only floor. The site states this in CSS
 * (`.hero-first-screen`, `min-height: calc(100svh - var(--header-height))`);
 * this is the same rule as arithmetic, for a frame that has no viewport of its
 * own, the dashboard's preview.
 */

/** The header's height: `--space-24`, which the header is drawn with. */
export const HEADER_HEIGHT_PX = 96;

export const heroHeight = (
  viewport: { width: number; height: number },
  headerHeight: number,
  contentHeight = 0,
): number => Math.max(viewport.height - headerHeight, contentHeight);
