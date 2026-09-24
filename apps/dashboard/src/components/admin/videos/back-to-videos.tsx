"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BUTTON_GHOST } from "@/components/ui/interactive";

/**
 * The way out of either editor, without saving.
 *
 * Shared because both forms draw it, and because it was drawn twice with a
 * hand-written class string that carried a hover but no pressed state — which
 * on a touch device is a control that lights up and then stays lit. The ghost
 * button recipe already has the whole set, so the fix is to stop rewriting it.
 *
 * A link rather than a button: it goes somewhere, so it should open in a new
 * tab on a middle click like every other link on the screen. The unsaved-work
 * question belongs to the form's own Cancel, which is beside the save.
 */
export const BackToVideos = () => {
  const t = useTranslations("Videos");

  return (
    <Link href="/videos" className={`${BUTTON_GHOST} w-fit gap-1.5`}>
      {/* Points back along the reading direction in both languages. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4 rotate-180 rtl:rotate-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m6 3 5 5-5 5" />
      </svg>
      {t("backToVideos")}
    </Link>
  );
};
