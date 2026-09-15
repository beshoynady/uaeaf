import { PhotoLines } from "./identity-hero";
import type { AppLocale } from "@/i18n/routing";
import { isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import { cloudinarySrcSet } from "@/lib/api/cloudinary-srcset";
import type { PublicImage } from "@/lib/api/types";

/**
 * A photograph beside a statement or a call, cut on a slant (ADR-0072 D6).
 *
 * - Below `lg` it is part of the column, full bleed to the screen's edges
 *   through the container's own margins, at its own ratio.
 * - From `lg` it leaves the container: placed against its section (which must
 *   be positioned) from the page edge on its side across five twelfths of the
 *   section less `--space-8`, the cap a portrait takes beside a title (ADR-0069
 *   D10), so the words keep seven columns. The height of the section, cropped
 *   to cover. Protocol §7 lets photography extend beyond containers.
 * - Its inner edge is cut `--slant` deep: `--space-12` on a phone, `-16` from
 *   `md`, `-24` from `lg`, `-32` from `xl`, so the cut stays near 72° as the
 *   photograph grows. The cut leans the way the identity's ascent leans,
 *   lower-left to upper-right, in either language: the polygon is physical,
 *   and each direction names its own (IL-7).
 * - Two light identity strokes cross the cut edge (`PhotoLines`).
 * - Content, not a ground: the asset's own alternative text, loaded lazily.
 *   Its entrance slides the picture in from the page edge inside the cut
 *   (`motion.css`), a `transform` on the picture alone.
 */

const SLANT = "[--slant:var(--space-12)] md:[--slant:var(--space-16)] lg:[--slant:var(--space-24)] xl:[--slant:var(--space-32)]";

/** On the left a photograph leans its right edge; on the right, its left edge.
 *  `start` is the left in English and the right in Arabic. */
const CUT: Record<"start" | "end", string> = {
  start:
    "ltr:[clip-path:polygon(0_0,100%_0,calc(100%_-_var(--slant))_100%,0_100%)] rtl:[clip-path:polygon(var(--slant)_0,100%_0,100%_100%,0_100%)]",
  end: "ltr:[clip-path:polygon(var(--slant)_0,100%_0,100%_100%,0_100%)] rtl:[clip-path:polygon(0_0,100%_0,calc(100%_-_var(--slant))_100%,0_100%)]",
};

export const SlantedPhoto = ({
  image,
  locale,
  side,
  sizes,
}: {
  image: PublicImage;
  locale: AppLocale;
  /** The reading-line end the photograph stands on from `lg`. */
  side: "start" | "end";
  sizes: string;
}) => (
  <div
    data-slanted-photo=""
    data-side={side}
    data-reveal=""
    className={`relative -mx-4 sm:-mx-6 md:-mx-8 lg:absolute lg:inset-y-0 lg:mx-0 lg:w-[calc(100%*5/12_-_var(--space-8))] ${
      side === "end" ? "lg:end-0" : "lg:start-0"
    } ${SLANT}`}
  >
    <div data-slant="" className={`relative h-full overflow-clip ${CUT[side]}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        srcSet={isCloudinaryUrl(image.url) ? cloudinarySrcSet(image.url, image.width) : undefined}
        sizes={sizes}
        alt={image.altText[locale]}
        width={image.width}
        height={image.height}
        loading="lazy"
        decoding="async"
        data-reveal-part="slide"
        className="block h-auto w-full lg:h-full lg:object-cover"
      />
    </div>
    <PhotoLines side={side} />
  </div>
);
