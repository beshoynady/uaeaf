import Image from "next/image";
import type { ElementType, ReactNode } from "react";

export type PhotoSurfaceProps = {
  /** Project asset path. Never a remote URL — ADR-0098's build downloads nothing. */
  src: string;
  /**
   * The photograph is behind a wash and carries no information a reader needs,
   * so it is decorative and takes an empty alt (Chapter 6 §6.11). Required
   * rather than defaulted, because "this image says nothing" should be a
   * decision someone made.
   */
  alt: "";
  /**
   * Only a hero passes this. Everything else is below the fold, and marking a
   * second image priority is how an LCP regression gets introduced by a prop
   * nobody reads.
   */
  priority?: boolean;
  mesh?: boolean;
  as?: ElementType;
  /** An anchor target, as on `Surface` and for the same reason. */
  id?: string;
  className?: string;
  children?: ReactNode;
};

/**
 * A photographic ground under a near-opaque wash (ADR-0098 D2).
 *
 * One asset serves both themes: the wash is white at 88% in light and black at
 * 85% in dark, so the photograph reads as a texture under the page rather than
 * as a picture, and no second asset is needed. That is also why the same file
 * is reused everywhere this surface appears — one request, cached.
 *
 * Text on this surface is measured against the **composited** result, never
 * against the wash colour alone: alpha-blend the sRGB channels and then
 * compute luminance. Blending in luminance space instead reported a failure
 * that was not there, once, in this codebase.
 *
 * Server Component. `sizes="100vw"` because this surface is always full-bleed;
 * a narrower use would need its own value rather than inheriting a wrong one.
 */
export const PhotoSurface = ({
  src,
  alt,
  priority = false,
  mesh = false,
  as: Element = "section",
  id,
  className,
  children,
}: PhotoSurfaceProps) => (
  <Element
    data-surface="photo-light"
    id={id}
    className={["brand-surface", className].filter(Boolean).join(" ")}
  >
    <Image
      className="brand-photo-image"
      src={src}
      alt={alt}
      fill
      sizes="100vw"
      priority={priority}
      aria-hidden="true"
    />
    <div className="brand-photo-scrim" aria-hidden="true" />
    {mesh ? <div className="brand-mesh" aria-hidden="true" /> : null}
    {children}
  </Element>
);
