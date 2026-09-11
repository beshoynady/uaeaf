import type { ReactNode } from "react";
import Image from "next/image";
import { UaeafMotif } from "@/components/brand/uaeaf-motif";
import { altOf, isExternalMedia } from "@/lib/api/media";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";
import { CONTAINER, REGISTER_CLASSES, type Register } from "./section";
import {
  HERO_COMPOSITION,
  HERO_MEASURE,
  HERO_MEDIA,
  HERO_MOTIF,
  HERO_PARALLAX,
  HERO_SCRIM,
  HERO_STAGE,
  HERO_TEXT,
  HERO_VIEWPORT,
} from "./surface";

/**
 * The hero every public listing page opens with.
 *
 * ── Composition ────────────────────────────────────────────────────────────
 *
 * `HERO_COMPOSITION` in `ui/surface` — the one composition every page that
 * opens with a hero now shares, contact included. Two columns at `md` and up,
 * stacked below it (Chapter 5 §5.10 Stacking, "most important first" — the
 * heading is first in the DOM either way), title block on the reading edge,
 * motif answering from the far side on the same baseline.
 *
 * The motif has a column of its own rather than sitting behind the text, and
 * that is a contrast decision, not a layout preference: artwork behind text
 * changes the measured ratio of every character it passes under, and Chapter
 * 6 puts WCAG AA above any aesthetic consideration. Two columns cannot
 * overlap at any width, so the ratio is the register's published one at every
 * breakpoint instead of something that has to be re-measured per viewport.
 *
 * ── The first screen follows the picture ───────────────────────────────────
 *
 * A hero owns the whole first screen when — and only when — it has something
 * to fill it with. That used to be a boolean an author remembered to set, and
 * the owner was right that a flag is the wrong shape for it: the condition it
 * encodes is "does this page have a hero image", which the component can see
 * for itself. So the height is derived from the picture. Upload one in the
 * admin panel and the page composes itself onto the first screen; remove it
 * and the hero shrinks back to its content rather than leaving 550px of empty
 * register behind, which is the dead space the height rule exists to remove.
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 *
 * `HERO_STAGE` orders the arrival: ground, heading, subtitle, motif, then
 * whatever the page puts after them. The vector does not mirror under RTL
 * (ADR-0059 §D7.1). The photograph is on its own plane and moves more slowly
 * than the type — the depth cue, and the only thing here that is not a
 * straight fade-and-rise.
 */
export function PageHero({
  register,
  title,
  subtitle,
  breadcrumb,
  titleId,
  heroImage,
  locale,
}: {
  register: Register;
  title: string;
  /** `null` where the record has no subtitle. The element is dropped rather
   *  than rendered empty — an empty paragraph is a gap in the vertical rhythm
   *  that reads as a bug. */
  subtitle: string | null;
  breadcrumb?: ReactNode;
  titleId: string;
  /** The page record's `heroImageId`, already resolved. Its presence is what
   *  decides the hero's height and its colour treatment — see above. */
  heroImage?: MediaAssetPublic;
  locale: AppLocale;
}) {
  const tone = REGISTER_CLASSES[register];
  const hasImage = Boolean(heroImage);

  return (
    <section
      aria-labelledby={titleId}
      data-register={register}
      data-testid="page-hero"
      data-fills-first-screen={hasImage ? "true" : "false"}
      className={`relative flex w-full flex-col justify-center overflow-hidden ${
        hasImage
          ? `${HERO_VIEWPORT} text-[color:var(--color-text-on-brand)]`
          : tone.surface
      }`}
    >
      {heroImage ? (
        <>
          {/* The ground plane. Its own element rather than the picture itself,
              because the picture carries the settle and this carries the
              parallax — two animations on one `transform` would silently
              leave only the last one running. */}
          <div aria-hidden={altOf(heroImage, locale) ? undefined : "true"} className={HERO_PARALLAX}>
            {isCloudinaryUrl(heroImage.file.url) ? (
              // A plain <img>, not next/image: the resizing is the CDN's, and
              // next/image can only be told that through a `loader` function,
              // which a server component may not hand to the client component
              // it renders. A srcset is a string, which may cross that line.
              //
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={heroImage.file.url}
                srcSet={cloudinarySrcSet(heroImage.file.url, heroImage.file.width)}
                sizes="100vw"
                alt={altOf(heroImage, locale)}
                fetchPriority="high"
                className={HERO_MEDIA}
              />
            ) : (
              <Image
                src={heroImage.file.url}
                alt={altOf(heroImage, locale)}
                fill
                priority
                unoptimized={isExternalMedia(heroImage.file.url)}
                sizes="100vw"
                className={HERO_MEDIA}
              />
            )}
          </div>
          <div aria-hidden="true" className={HERO_SCRIM} />
        </>
      ) : null}

      <div className={`relative ${CONTAINER} ${HERO_COMPOSITION} py-12 md:py-16 lg:py-20`}>
        <div className={HERO_TEXT}>
          {breadcrumb}
          <h1
            id={titleId}
            className="rise-in text-h1 text-balance"
            style={{ "--rise-index": HERO_STAGE.title } as React.CSSProperties}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className={`rise-in mt-4 ${HERO_MEASURE} text-body-lg ${
                hasImage ? "opacity-85" : tone.muted
              }`}
              style={{ "--rise-index": HERO_STAGE.subtitle } as React.CSSProperties}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* The identity's own geometry, at the scale the composition can
            carry. `tone="inherit"` on a coloured register or over a
            photograph because Federation Green and Federation Red measure
            1.15:1 against each other (ADR-0059 §D2) — the brand-coloured
            strokes would disappear into a green or red ground, and the black
            stroke into the black one. */}
        <UaeafMotif
          tone={register === "neutral" && !hasImage ? "brand" : "inherit"}
          className={`rise-in ${HERO_MOTIF} ${hasImage ? "opacity-25" : "opacity-70"}`}
          style={{ "--rise-index": HERO_STAGE.motif } as React.CSSProperties}
        />
      </div>
    </section>
  );
}
