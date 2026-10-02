import Image from "next/image";
import { altOf, isExternalMedia } from "@/lib/api/media";
import type { MediaAssetPublic } from "@/lib/api/types";
import type { AppLocale } from "@/i18n/routing";

/**
 * A season's logo, or its short name where it has none.
 *
 * The fallback is text in a dashed frame (spec §4.1), never a drawn stand-in:
 * `26/27` is the season's own name, so the frame says something true while the
 * editor has not uploaded a logo. Drawn in the hero and on every archive card.
 */
export const SeasonMark = ({
  logo,
  shortName,
  locale,
  size = "md",
}: {
  logo: MediaAssetPublic | undefined;
  shortName: string;
  locale: AppLocale;
  size?: "md" | "lg";
}) => {
  const box = size === "lg" ? "size-24 md:size-32" : "size-24";

  return logo ? (
    <Image
      src={logo.file.url}
      alt={altOf(logo, locale)}
      width={logo.file.width}
      height={logo.file.height}
      // `--space-32` (128px) at its largest: `sizes` takes a length, not a custom property.
      sizes="8rem"
      unoptimized={isExternalMedia(logo.file.url)}
      className={`${box} shrink-0 rounded-[var(--radius-lg)] object-contain`}
    />
  ) : (
    <span
      className={`${box} flex shrink-0 items-center justify-center rounded-[var(--radius-lg)] border-[length:var(--border-width-thick)] border-dashed border-[color:var(--surface-border)] text-h4 font-bold text-[color:var(--surface-text)]`}
    >
      <bdi dir="ltr">{shortName}</bdi>
    </span>
  );
};
