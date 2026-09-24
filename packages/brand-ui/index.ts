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
export { Surface, SURFACE_KINDS } from "./surface/surface";
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
export { Tabs } from "./controls/tabs";
export type { TabItem, TabsProps } from "./controls/tabs";

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

// Added in Phase H, each for a shape the inventory found written out in two or
// more places. Nothing here was added for a pattern that appeared once.
export { StatCard } from "./content/stat-card";
export type { StatCardProps, StatTone } from "./content/stat-card";
export { FeatureCard, FEATURE_CYCLE } from "./content/feature-card";
export type { FeatureCardProps, FeatureTone } from "./content/feature-card";
export { InfoCard } from "./content/info-card";
export type { InfoCardProps } from "./content/info-card";
export { SplitFeature } from "./content/split-feature";
export type { SplitFeatureProps } from "./content/split-feature";
export { StepBadge } from "./content/step-badge";
export type { StepBadgeProps } from "./content/step-badge";
export { TableHeader } from "./content/table-header";
export type { TableHeaderProps } from "./content/table-header";
export { GlassTile } from "./content/glass-tile";
export type { GlassTileProps } from "./content/glass-tile";

/**
 * The hover draw line is a class, not a component: it decorates something that
 * already exists rather than wrapping it, and wrapping every list row in an
 * extra element to obtain one pseudo-element is the worse trade.
 */
export const BRAND_DRAW_LINE = "brand-draw-line";

/** Visually hidden, still announced. Exported so applications reuse one rule. */
export const BRAND_VISUALLY_HIDDEN = "brand-visually-hidden";

/**
 * The package's focus indicator, for a focusable element this package does not
 * own — a card link, a rail arrow, a native `<select>`.
 *
 * Exported as a class rather than left to each application, because the
 * alternative is measured: the same ring was written out at six call sites in
 * the video system, and one of them lost it entirely when an inline
 * `box-shadow` edge overrode it.
 */
export const BRAND_FOCUSABLE = "brand-focusable";

/** Widens that indicator's gap to 4px, which is what a card needs. */
export const BRAND_FOCUS_WIDE = "brand-focus-wide";

/**
 * The content measure this package's own blocks use — 1440px with the site's
 * five padding steps. Exported so a page laying out beside a kit block lines up
 * with it instead of guessing.
 */
export const BRAND_CONTAINER = "brand-container";
