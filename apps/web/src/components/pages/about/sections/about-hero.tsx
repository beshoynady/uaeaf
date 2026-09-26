import { IdentityHero } from "@/components/ui/identity-hero";
import type { AppLocale } from "@/i18n/routing";
import type { AboutPage } from "@/lib/about/types";

/**
 * Scene 01 — the hero.
 *
 * `IdentityHero` itself (ADR-0069 D10), the institutional photographic hero
 * the President's Message, Vision & Mission and the Strategic Plan already
 * carry. This page is the fourth of that family and takes the same composition
 * rather than a fourth variant of it (owner decision 2026-09-25): the
 * photographic hero on these pages keeps its structure, and only colours,
 * tokens and the entrance may differ.
 *
 * So the record supplies the words and the picture, and the composition —
 * including the parallax and the scroll hint that make up this scene's motion
 * — is the shared component's. There is no motion code here, which is the
 * point: one hero, one entrance, four pages.
 *
 * The record's picture is passed straight through: an About picture is the
 * same `PublicImage` this component already takes, so there is nothing to
 * adapt.
 *
 * ── What the approved canvas drew that is not here ────────────────────────
 *
 * The tricolour rule under the title, the concentric rings, the brand mark at
 * the bottom edge, and the labelled "scroll to discover" link. None is part of
 * `IdentityHero`, and adding them would have meant either editing a component
 * three other pages depend on or building a fourth hero. All four are recorded
 * as deviations from the canvas in `docs/engineering/about-federation-page.md`.
 *
 * ── No breadcrumb ────────────────────────────────────────────────────────
 *
 * The institutional pages pass none and keep the trail in their structured
 * data (owner decision 2026-09-15, ADR-0072 D7). `AboutScreen` emits it as
 * `BreadcrumbList`.
 */

export const AboutHero = ({
  hero,
  locale,
}: {
  hero: NonNullable<AboutPage["hero"]>;
  locale: AppLocale;
}) => (
  <IdentityHero
    titleId="about-hero-title"
    eyebrow={hero.eyebrow[locale]}
    title={hero.title[locale]}
    subtitle={hero.description[locale]}
    subtitleField="hero.description"
    ground={hero.image}
    locale={locale}
  />
);
