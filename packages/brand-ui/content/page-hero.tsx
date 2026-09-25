import type { ReactNode } from "react";

import { BrandAccentBar } from "../accent/brand-accent-bar";
import { BrandStreaks } from "../accent/brand-streaks";
import { Surface } from "../surface/surface";

export type BreadcrumbItem = {
  label: string;
  /** Omitted on the current page, which is text rather than a link. */
  href?: string;
};

export type PageHeroProps = {
  title: ReactNode;
  description?: ReactNode;
  /**
   * Omitted where the trail is structured data only.
   *
   * ADR-0072 D7 rules that the /about pages emit their breadcrumb to
   * `BreadcrumbJsonLd` and draw nothing. Requiring the prop here silently
   * reversed that ruling on every page that adopted this hero, which is a
   * governance change a component is not allowed to make. Empty and absent
   * both draw nothing.
   */
  breadcrumb?: BreadcrumbItem[];
  /** The localised name for the breadcrumb landmark, e.g. "مسار التنقل". */
  breadcrumbLabel?: string;
  /**
   * An editor-managed photograph, and the whole composition when there is one.
   *
   * A node rather than a URL, so the application supplies its own `<Image>`
   * with its own loader, sizes and priority — the library needs to know
   * nothing about where the file came from, and `PhotoSurface` (local project
   * assets only) cannot serve a record's `heroImage`.
   *
   * **Its presence is what chooses the composition** (owner decision
   * 2026-09-25), which is ADR-0067 D2's existing rule for every other hero on
   * the site: a page whose record carries a picture opens on the first screen
   * under the measured scrim, and a page whose record carries none keeps the
   * ink band ADR-0098 D2 drew, unchanged. An editor changes the composition by
   * uploading or removing the picture, never by a setting, and no author has a
   * flag to forget.
   */
  media?: ReactNode;
  /** A search field, a filter row, or nothing. */
  slot?: ReactNode;
  className?: string;
};

/**
 * The page hero — the ink band (ADR-0098 D2, §8.4), and the photographic
 * composition when the record has a picture.
 *
 * ── Two compositions, chosen by the data ───────────────────────────────────
 *
 * With `media` the hero fills the first screen with the photograph under the
 * measured 64→74% scrim, and the mesh and the track lines are not drawn: the
 * cue a photograph needs is the photograph. Without it, nothing below changes
 * and the band is exactly what D2 drew. `page-hero.css` carries the modifier
 * rules and the entrance; the reasons live there.
 *
 * Four colours and no more: ink, green, red, white. PR-001's anti-pattern list
 * caps a hero at four, and this composition sits exactly on the cap — so a
 * fifth colour here is not a judgement call, it is a rule already written.
 *
 * The mesh is not decoration on this surface. `#0B0B0B` measures 1.05:1 against
 * the dark page ground, so without a cue that is not the ground the hero stops
 * being a region in dark theme. Both cues are present: the accent bar at the
 * foot and the mesh behind. §8.4 requires at least one.
 *
 * The track lines are faint and drawn as a repeating gradient rather than an
 * asset, so they cost no request and scale to any width.
 *
 * Server Component. Everything here is markup, and the slot is where a client
 * component goes if a page needs one.
 */
export const PageHero = ({
  title,
  description,
  breadcrumb,
  breadcrumbLabel,
  media,
  slot,
  className,
}: PageHeroProps) => (
  <Surface
    kind="ink"
    /*
      `mesh` stays on the tag in both compositions, and that is not a guard
      formality: the ink ground is still what this hero falls back to, and
      `surface-adjacency-contract.spec.ts` requires the cue on every
      `<Surface kind="ink">` because ink measures 1.05:1 against the dark page.
      Over a picture the element is simply not painted (`page-hero.css`).
    */
    mesh
    className={["brand-page-hero", media === undefined ? null : "brand-page-hero--photo", className]
      .filter(Boolean)
      .join(" ")}
  >
    {media === undefined ? null : (
      <div className="brand-page-hero__media" aria-hidden="true">
        {media}
        {/*
          The exposure layer: a black plane clearing to nothing over the
          entrance, which composites to the same result as animating
          `filter: brightness()` on the picture and animates a property the
          compositor already handles per frame (ADR-0009). It sits above the
          picture and below the scrim, so at rest it contributes nothing.
        */}
        <span className="brand-page-hero__expose" />
      </div>
    )}
    {media === undefined ? <div className="brand-page-hero__track" aria-hidden="true" /> : null}
    <BrandStreaks placement="corner" />

    <div className="brand-page-hero__body brand-container">
      {breadcrumb === undefined || breadcrumb.length === 0 ? null : (
        <nav
          aria-label={breadcrumbLabel}
          className="brand-page-hero__breadcrumb brand-page-hero__line"
        >
          <ol>
            {breadcrumb.map((item, index) => (
              <li key={`${item.label}-${index}`}>
                {item.href === undefined ? (
                  /*
                    The current page is the last item and is not a link.
                    `aria-current="page"` is what tells a screen reader which one
                    it is; styling it differently is not enough on its own.
                  */
                  <span aria-current="page">{item.label}</span>
                ) : (
                  <a href={item.href}>{item.label}</a>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/*
        The line and its clip box, in the markup for both compositions: over a
        photograph `page-hero.css` makes the outer element a clip box and the
        inner one rises out of it, and on the band the outer element clips
        nothing so the heading is painted complete in its first frame. One
        structure, one rule, no branch — and the heading is never the element
        that waits, because on the band it is the largest contentful paint.
      */}
      <h1 className="brand-page-hero__title brand-page-hero__reveal">
        <span className="brand-page-hero__line">{title}</span>
      </h1>
      {description === undefined ? null : (
        <p className="brand-page-hero__description brand-page-hero__reveal">
          <span className="brand-page-hero__line">{description}</span>
        </p>
      )}
      {slot === undefined ? null : <div className="brand-page-hero__slot">{slot}</div>}
    </div>

    <BrandAccentBar className="brand-page-hero__edge" />
  </Surface>
);
