import { HERO_SCRIM } from "./surface";
import type { AppLocale } from "@/i18n/routing";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { PublicImage } from "@/lib/api/types";

/**
 * A stored photograph as the ground of a content panel (ADR-0070 D4).
 *
 * Every picture a content page prints is content with a field on its record
 * (owner rule 2026-09-14), so a section's background arrives from the record
 * like the hero's does, and the section stands without it when there is none.
 *
 * - Under `HERO_SCRIM`, the overlay solved against the worst admissible
 *   picture: white text on the panel clears WCAG AA whatever an editor
 *   uploads, the guarantee every hero already carries.
 * - On its own plane behind the panel's content, without the heroes'
 *   parallax: a section further down the page is not a stage.
 * - Loaded lazily, since no panel is in the first screen.
 * - The alternative text is the asset's own; an asset without one is
 *   presented as decoration.
 */
export const PhotoGround = ({ image, locale }: { image: PublicImage; locale: AppLocale }) => (
  <>
    <div
      aria-hidden={image.altText[locale] ? undefined : "true"}
      className="pointer-events-none absolute inset-0 -z-10"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        srcSet={isCloudinaryUrl(image.url) ? cloudinarySrcSet(image.url, image.width) : undefined}
        sizes="100vw"
        alt={image.altText[locale]}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        className="size-full object-cover"
      />
    </div>
    <div aria-hidden="true" className={`${HERO_SCRIM} -z-10`} />
  </>
);

/** The panel a photograph grounds: its own stacking context, so the ground
 *  stays behind its content; clipped to the large radius; text in the colour
 *  that sits on a scrimmed photograph. */
export const PHOTO_PANEL =
  "relative isolate overflow-clip rounded-[var(--radius-lg)] text-[color:var(--color-text-on-brand)]";
