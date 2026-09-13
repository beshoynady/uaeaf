"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useStampedTheme, type Theme } from "@/lib/theme/use-stamped-theme";

/**
 * The federation's mark, as the dashboard shows it.
 *
 * One component for both places it appears — the signed-out frame and the
 * signed-in shell — because both have to answer the same two questions the
 * same way.
 *
 * - **Which artwork.** The matched trio in docs/design-system/brand-assets
 *   shares one 170x168 viewBox, so the colour and white marks are the same
 *   artwork: colour on the light ground, white on the dark one (guide §6.1).
 *   The choice follows `data-theme` on <html>, not the theme cookie. The
 *   toggle rewrites the attribute without refreshing the server, and a mark
 *   chosen once from the cookie stayed the black-lettered colour artwork on a
 *   dark ground until the next page load.
 * - **What it is called.** The federation's own name, not "logo": a
 *   screen-reader user needs to know whose dashboard this is.
 *
 * §9.1: the mark is never mirrored, recoloured or stretched. It takes no
 * `className` for that reason — a call site cannot add a transform the mark
 * must not have.
 */
export const BrandMark = ({ initialTheme }: { initialTheme: Theme }) => {
  const t = useTranslations("Auth");
  const theme = useStampedTheme(initialTheme);

  return (
    <Image
      src={theme === "dark" ? "/brand/uaeaf-logo-white.svg" : "/brand/uaeaf-logo-color.svg"}
      alt={t("federation")}
      width={170}
      height={168}
      priority
      className="h-10 w-[40.5px] shrink-0"
    />
  );
};
