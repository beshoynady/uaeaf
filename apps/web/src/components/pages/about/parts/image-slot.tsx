import Image from "next/image";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/api/cloudinary-loader";
import type { AppLocale } from "@/i18n/routing";
import type { AboutImage } from "@/lib/about/types";

/**
 * A picture on the About page, or the surface that stands where one is not
 * there yet.
 *
 * ── The empty state is a design, not a failure ────────────────────────────
 *
 * The federation is still gathering its archive, and the page has to be
 * publishable before every photograph exists. An empty slot therefore draws a
 * graded surface in the identity's own colours, sized exactly as the picture
 * would be, so the composition holds and nothing moves when the picture
 * arrives later. It carries no text: a visitor is not told that something is
 * missing, because from their side nothing is.
 *
 * ── Alternative text ─────────────────────────────────────────────────────
 *
 * Read from the asset's own record. Absent, the image is marked decorative
 * (`alt=""`) rather than given an invented description — a wrong description
 * is worse for a screen reader than none, because it cannot be told apart from
 * a right one.
 */
export const ImageSlot = ({
  image,
  locale,
  sizes,
  tone = "green",
  className = "",
  priority = false,
}: {
  image: AboutImage | null;
  locale: AppLocale;
  sizes: string;
  /** Which identity colour the empty surface is graded in, so two empty slots
   *  on one screen are not the same rectangle twice. */
  tone?: "green" | "red" | "ink";
  className?: string;
  priority?: boolean;
}) => {
  if (!image) {
    return <span aria-hidden="true" className={`block ${EMPTY_TONES[tone]} ${className}`} />;
  }

  return (
    <Image
      src={image.url}
      alt={image.altText?.[locale] ?? ""}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
      loader={isCloudinaryUrl(image.url) ? cloudinaryLoader : undefined}
      unoptimized={!isCloudinaryUrl(image.url)}
    />
  );
};

/** Written out rather than composed, so Tailwind sees each class whole. */
const EMPTY_TONES = {
  green: "h-full w-full bg-[linear-gradient(160deg,var(--color-brand-primary),var(--color-section-black-surface))] opacity-90",
  red: "h-full w-full bg-[linear-gradient(160deg,var(--color-brand-secondary),var(--color-section-black-surface))] opacity-90",
  ink: "h-full w-full bg-[linear-gradient(160deg,var(--color-section-black-surface),var(--color-surface-sunken))] opacity-95",
} as const;
