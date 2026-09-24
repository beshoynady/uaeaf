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
   * An editor-managed photograph behind the ink.
   *
   * A node rather than a URL, so the application supplies its own `<Image>`
   * with its own loader, sizes and priority — the library needs to know
   * nothing about where the file came from, and `PhotoSurface` (local project
   * assets only) cannot serve a record's `heroImage`.
   *
   * The ink stays: the photograph sits under a wash, because this hero's text
   * contrast is measured against `#0B0B0B` and an uncontrolled photograph has
   * no measurable luminance.
   */
  media?: ReactNode;
  /** A search field, a filter row, or nothing. */
  slot?: ReactNode;
  className?: string;
};

/**
 * The ink hero (ADR-0098 D2, §8.4).
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
    mesh
    className={["brand-page-hero", className].filter(Boolean).join(" ")}
  >
    {media === undefined ? null : (
      <div className="brand-page-hero__media" aria-hidden="true">
        {media}
      </div>
    )}
    <div className="brand-page-hero__track" aria-hidden="true" />
    <BrandStreaks placement="corner" />

    <div className="brand-page-hero__body brand-container">
      {breadcrumb === undefined || breadcrumb.length === 0 ? null : (
        <nav aria-label={breadcrumbLabel} className="brand-page-hero__breadcrumb">
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

      <h1 className="brand-page-hero__title">{title}</h1>
      {description === undefined ? null : (
        <p className="brand-page-hero__description">{description}</p>
      )}
      {slot === undefined ? null : <div className="brand-page-hero__slot">{slot}</div>}
    </div>

    <BrandAccentBar className="brand-page-hero__edge" />
  </Surface>
);
