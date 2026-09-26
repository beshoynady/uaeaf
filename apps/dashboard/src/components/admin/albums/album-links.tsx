"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UiIcon } from "@/lib/icons/ui-icons";
import { BUTTON_GHOST, BUTTON_PRIMARY } from "@/components/ui/interactive";

/**
 * The two ways in and out of the album screens.
 *
 * Shared because each appears twice — "add an album" in the page header and in
 * the empty list, "back to albums" on both the new and the edit page — and two
 * copies are two places for an address or a word to drift.
 */
export const AddAlbumLink = ({ label }: { label?: string }) => {
  const t = useTranslations("Albums");

  return (
    <Link href="/albums/new" className={`${BUTTON_PRIMARY} gap-2`}>
      <UiIcon name="plus" className="size-[var(--icon-size-xs)]" />
      {label ?? t("addAlbum")}
    </Link>
  );
};

/** A link rather than a button: it goes somewhere, so a middle click opens it
 *  in a new tab like any other link. Unsaved work is the form's Cancel's
 *  question, beside its Save. */
export const BackToAlbums = () => {
  const t = useTranslations("Albums");

  return (
    <Link href="/albums" className={`${BUTTON_GHOST} w-fit gap-1.5`}>
      {/* Points back along the reading direction in both languages. */}
      <UiIcon name="chevron-right" className="size-[var(--icon-size-xs)] rotate-180 rtl:rotate-0" />
      {t("backToAlbums")}
    </Link>
  );
};
