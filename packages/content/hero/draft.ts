import type { HeroImageLike } from "./image";

/**
 * What the dashboard needs to preview a slide nobody has saved yet.
 *
 * A saved slide reaches the site with its English picture already resolved by
 * the API (`desktopLtr`). A slide still being edited has only its settings, so
 * the preview resolves the same rule here (ADR-0080 D1): `mirror` flips the
 * picture and its focal point, `same` keeps it, `separate` uses the English
 * picture once both it and its point are chosen.
 */
export const resolveLtrPicture = (
  mode: "same" | "mirror" | "separate",
  desktop: HeroImageLike | null,
  separate: HeroImageLike | null,
): (HeroImageLike & { mirrored: boolean }) | null => {
  if (!desktop) return null;
  if (mode === "separate") return separate ? { ...separate, mirrored: false } : null;
  if (mode === "same") return { ...desktop, mirrored: false };
  return {
    image: desktop.image,
    focalPoint: { x: 100 - desktop.focalPoint.x, y: desktop.focalPoint.y },
    mirrored: true,
  };
};

/**
 * The narrowest picture that stays sharp: the widest first screen the hero is
 * measured at (1920px, ADR-0078's table) at twice the density, and a 390px phone
 * at three times. A warning, never a refusal: a softer picture is the editor's
 * call, not the system's.
 */
export const HERO_IMAGE_MIN_WIDTH = { desktop: 1920 * 2, mobile: 390 * 3 } as const;

export const isSmallImage = (width: number, device: "desktop" | "mobile"): boolean =>
  width < HERO_IMAGE_MIN_WIDTH[device];
