import type { CSSProperties } from "react";
import { resolveImage } from "@uaeaf/content/hero";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import type { AppLocale } from "@/i18n/routing";
import type { HeroSlidePublic } from "@/lib/api/types";

/**
 * A slide's picture, cropped to the hero's frame around the point the editor
 * chose, in the reading direction's version.
 *
 * ── Never stretched ───────────────────────────────────────────────────────
 *
 * `object-fit: cover` with `object-position` from the focal point. The
 * picture keeps its own aspect ratio at every width and the frame takes the
 * part the editor framed; nothing here scales the two axes independently.
 *
 * ── The phone crop switches on the server ────────────────────────────────
 *
 * A `<source media>` inside `<picture>` is resolved by the browser before it
 * requests anything, so a phone never downloads the landscape frame and no
 * JavaScript participates in the choice. The switch is at 640px, the width
 * below which the hero's frame is taller than it is wide. `<source>` cannot
 * carry a style, so the two framings ride on the one `<img>` as two custom
 * properties the same breakpoint swaps between (`motion.css`).
 *
 * ── The English picture (`ltrImageMode`, ADR-0080) ───────────────────────
 *
 * English gets the version `resolveImage` (`@uaeaf/content/hero`, shared with
 * the dashboard's preview) resolves: the same picture flipped,
 * the same picture, or a separate one. The flip is `.hero-mirror` on the
 * `<picture>`, in the server's markup, so the first frame is already the
 * flipped one. The portrait phone picture is never flipped.
 *
 * ── Three layers, one job each ───────────────────────────────────────────
 *
 * `.hero-ken-burns` (the camera's slow move, scaled about where the reader sees
 * the subject) → `<picture>` (the flip) → `<img>` (the crop). Kept apart so the
 * controller's transform can never overwrite the flip.
 */

export const HeroPicture = ({
  slide,
  locale,
  eager,
}: {
  slide: HeroSlidePublic;
  locale: AppLocale;
  eager: boolean;
}) => {
  // The landscape crop for this language, and the crop a phone gets: the
  // portrait picture when the slide has one, the landscape one otherwise.
  const landscape = resolveImage(slide, locale, "desktop")!;
  const phone = resolveImage(slide, locale, "mobile")!;
  const { mobile } = slide;
  const { image } = landscape;

  return (
    <span
      data-hero-ken-burns=""
      className="hero-ken-burns block size-full"
      style={
        {
          "--hero-origin-desktop": landscape.origin,
          "--hero-origin-mobile": phone.origin,
        } as CSSProperties
      }
    >
      <picture
        className={`block size-full ${landscape.mirrored ? "hero-mirror" : ""}`}
        data-has-mobile={mobile ? "" : undefined}
      >
        {mobile ? (
          <source
            media="(max-width: 640px)"
            srcSet={
              isCloudinaryUrl(mobile.image.url)
                ? cloudinarySrcSet(mobile.image.url, mobile.image.width)
                : mobile.image.url
            }
            // A phone's frame is the viewport, so one CSS pixel of layout is
            // one CSS pixel of picture; the browser multiplies by the device
            // ratio itself.
            sizes="100vw"
            width={mobile.image.width}
            height={mobile.image.height}
          />
        ) : null}
        <img
          src={image.url}
          srcSet={isCloudinaryUrl(image.url) ? cloudinarySrcSet(image.url, image.width) : undefined}
          sizes="100vw"
          width={image.width}
          height={image.height}
          alt={image.altText[locale]}
          // The first slide is the page's Largest Contentful Paint and the only
          // one a reader is guaranteed to see; the controller asks for the next
          // one ahead of its transition.
          fetchPriority={eager ? "high" : "auto"}
          loading={eager ? "eager" : "lazy"}
          decoding={eager ? "sync" : "async"}
          className="hero-picture size-full object-cover"
          style={
            {
              "--hero-focus-desktop": landscape.objectPosition,
              "--hero-focus-mobile": phone.objectPosition,
            } as CSSProperties
          }
        />
      </picture>
    </span>
  );
};
