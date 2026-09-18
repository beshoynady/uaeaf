import { displayName } from "@uaeaf/content/sponsors";
import type { AppLocale } from "@/i18n/routing";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import type { OrganizationNamePublic, PublicImage } from "@/lib/api/types";
import { FONT_FOR } from "./organization-name";

/**
 * A third party's mark on its plate (ADR-0085 D6, D6.1).
 *
 * - `object-fit: contain`, never cropped or recoloured (Chapter 8 §M.9), and
 *   never drawn above half its source in pixels (ADR-0086 D4).
 * - The plate is `--color-logo-plate`, white in every list: supplied logos
 *   arrive on an opaque white ground, and any other plate would show the
 *   file's edge as a box. It stands bare on the black register (the strip,
 *   the banner) and otherwise inside a card, which is the bounded object.
 *   In high contrast and in forced-colors it draws its own edge instead:
 *   every coloured register is white there, so the fill bounds nothing
 *   (ADR-0085 D8 #3).
 * - The alternative text is the organisation's name in its own language
 *   (`lang`), not the asset's stored caption; when the name is printed beside
 *   the logo the image is hidden from readers, so the name is heard once
 *   (decision K).
 * - No logo: the name stands in the logo's place, in the ground's own ink and
 *   without the white plate (a plate is for a mark that arrives on white),
 *   never an empty plate and never a placeholder (page rule 2 B-4).
 *
 * A plain `img`, as the identity lines use: the CDN resizes, and a server
 * component cannot hand next/image a loader function.
 */

type LogoSize = "strip" | "card" | "banner";

/** Plate sizes on the 8pt scale (Chapter 3 §3.14). The banner's plate stays at
 *  or under 128 CSS px so the 284px source real sponsor logo renders at least
 *  2× on a retina screen (ADR-0085 D6).
 *
 *  The card's plate is `h-36` with `p-3`, so 120 CSS px of content (ADR-0086
 *  D4). 120 is not chosen for looks: it is the largest height at which every
 *  logo the federation has stays at or under half its own source — the
 *  480×240 marks land exactly on their 240×120 ceiling, and one pixel more
 *  would cross it. The strip is out of that rule; its height is set by its own
 *  layout (ADR-0085 D9). */
const PLATE: Record<LogoSize, string> = {
  strip: "h-10 w-20 p-1",
  card: "h-36 w-full p-3",
  banner: "size-24 md:size-32 p-2",
};

/** The widest the image is drawn at 2×, per size, so the CDN never sends more. */
const CDN_WIDTH: Record<LogoSize, number> = { strip: 192, card: 640, banner: 256 };

const src = (url: string, size: LogoSize) => (isCloudinaryUrl(url) ? cloudinaryLoader({ src: url, width: CDN_WIDTH[size] }) : url);

export const OrganizationLogo = ({
  logo,
  name,
  locale,
  size,
  decorative = false,
}: {
  logo: PublicImage | null;
  name: OrganizationNamePublic;
  locale: AppLocale;
  size: LogoSize;
  /** The name is printed beside the logo: hide the image from readers. */
  decorative?: boolean;
}) => {
  const shown = displayName(name, locale);
  const plate = `flex shrink-0 items-center justify-center overflow-clip rounded-[var(--radius-md)] bg-[color:var(--color-logo-plate)] ${PLATE[size]}`;

  if (!logo) {
    return (
      <span
        className={`flex shrink-0 items-center justify-center rounded-[var(--radius-md)] ${PLATE[size]}`}
        aria-hidden={decorative ? "true" : undefined}
      >
        {shown ? (
          <bdi lang={shown.lang} className={`${FONT_FOR[shown.lang]} text-center text-body-sm font-bold text-balance`}>
            {shown.text}
          </bdi>
        ) : null}
      </span>
    );
  }

  return (
    // `data-logo-plate` is what lets the plate draw its own edge in the
    // high-contrast list and in forced-colors, where its white fill stops
    // being a boundary (ADR-0085 D8 #3, `styles/motion.css`). The no-logo
    // branch above carries no plate and so no mark.
    <span className={plate} data-logo-plate="">
      {/* eslint-disable-next-line @next/next/no-img-element -- see the component note: the CDN resizes. */}
      <img
        src={src(logo.url, size)}
        width={logo.width}
        height={logo.height}
        alt={decorative || !shown ? "" : shown.text}
        lang={decorative || !shown ? undefined : shown.lang}
        aria-hidden={decorative ? "true" : undefined}
        loading="lazy"
        decoding="async"
        // The ceiling, enforced per logo from its own stored size rather than
        // by trusting a plate to be small enough (ADR-0086 D4): a raster mark
        // is never drawn above half its source, so a 284px file stops at
        // 142px and a later layout change cannot stretch it past that.
        style={{ maxInlineSize: logo.width / 2, maxBlockSize: logo.height / 2 }}
        className="block h-full w-full object-contain"
      />
    </span>
  );
};
