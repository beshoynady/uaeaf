/**
 * `@uaeaf/brand-ui` — the UAEAF identity layer as components (ADR-0098).
 *
 * One entry point, so a consumer never reaches into a subdirectory and a
 * component can move between groups without breaking an import.
 *
 * The contract every component here keeps:
 *
 * 1. **No background-aware prop.** Colours are read from the enclosing
 *    `Surface` through CSS custom properties. There is no `onDark`, no
 *    `background`, no `theme`. Moving a component to a different surface
 *    requires changing nothing about the component.
 * 2. **Server Component unless it cannot be.** Only `FilterChip` and
 *    `SearchField` carry `'use client'`, and both have real state and real
 *    handlers. Hover, focus and every rotation are CSS.
 * 3. **No colour, gradient, duration or border width written inside.** Tokens
 *    only — guarded by the token contract specs in `apps/web`.
 * 4. **Direction and theme are automatic.** Logical properties throughout; the
 *    two values that have no logical form (gradient angle, `transform-origin`)
 *    are resolved once at system level from `[dir]`.
 * 5. **`className` positions, never colours.**
 *
 * Styles are a separate import, because CSS ordering is the application's to
 * control:
 *
 *   import "@uaeaf/brand-ui/surfaces.css";
 */

// Foundations
export { Surface } from "./surface/surface";
export type { SurfaceKind, SurfaceProps } from "./surface/surface";
export { PhotoSurface } from "./surface/photo-surface";
export type { PhotoSurfaceProps } from "./surface/photo-surface";

// Accents
export { BrandAccentBar } from "./accent/brand-accent-bar";
export type { BrandAccentBarProps } from "./accent/brand-accent-bar";
export { TricolorDivider } from "./accent/tricolor-divider";
export type { TricolorDividerProps } from "./accent/tricolor-divider";
export { BrandStreaks } from "./accent/brand-streaks";
export type { BrandStreaksPlacement, BrandStreaksProps } from "./accent/brand-streaks";
export { BrandBorder } from "./accent/brand-border";
export type {
  BrandBorderProps,
  BrandBorderTone,
  BrandBorderVariant,
} from "./accent/brand-border";

// Controls
export { Button } from "./controls/button";
export type { ButtonProps, ButtonSize, ButtonVariant } from "./controls/button";
export { IconButton } from "./controls/icon-button";
export type { IconButtonProps } from "./controls/icon-button";
export { FilterChip } from "./controls/filter-chip";
export type { FilterChipProps } from "./controls/filter-chip";
export { SearchField } from "./controls/search-field";
export type { SearchFieldProps } from "./controls/search-field";

// Content
export { SectionHeading } from "./content/section-heading";
export type { SectionHeadingProps } from "./content/section-heading";
export { PageHero } from "./content/page-hero";
export type { BreadcrumbItem, PageHeroProps } from "./content/page-hero";
export { DocumentCard } from "./content/document-card";
export type { DocumentCardProps, DocumentCategory } from "./content/document-card";
export { LinkTile } from "./content/link-tile";
export type { LinkTileProps } from "./content/link-tile";
export { CtaBand } from "./content/cta-band";
export type { CtaBandProps } from "./content/cta-band";
export { EmptyState } from "./content/empty-state";
export type { EmptyStateProps } from "./content/empty-state";
export { StatHighlight } from "./content/stat-highlight";
export type { StatHighlightProps } from "./content/stat-highlight";
export { AthleteResultBadge } from "./content/athlete-result-badge";
export type { AthleteResultBadgeProps } from "./content/athlete-result-badge";

/**
 * The hover draw line is a class, not a component: it decorates something that
 * already exists rather than wrapping it, and wrapping every list row in an
 * extra element to obtain one pseudo-element is the worse trade.
 */
export const BRAND_DRAW_LINE = "brand-draw-line";

/** Visually hidden, still announced. Exported so applications reuse one rule. */
export const BRAND_VISUALLY_HIDDEN = "brand-visually-hidden";
