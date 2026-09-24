import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { UiIcon } from "@/lib/icons/ui-icons";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "@/components/ui/interactive";

/**
 * The two ways to put something new on the site.
 *
 * Shared because they appear twice: in the page header, where the design puts
 * them, and inside the empty state, where an editor with no videos yet needs
 * the same offer without hunting back up the page. Two copies would be two
 * places for the address or the wording to drift.
 */

/** Red, and first. Starting a broadcast is the consequential act on this
 *  screen — it changes what every visitor sees — and the design gives it the
 *  federation red rather than the ordinary primary. */
export const GoLiveLink = () => {
  const t = useTranslations("Videos");

  return (
    <Link
      href="/videos/live/new"
      // The colour is an inline style, not a class: `BUTTON_SECONDARY` sets
      // `color` itself, and two arbitrary `text-[color:…]` utilities resolve by
      // stylesheet order rather than by which one the call site wrote last —
      // so the recipe won and this read as an ordinary dark button with a red
      // edge. The design gives the word itself the federation red.
      style={{ color: "var(--color-semantic-error-text)" }}
      className={`${BUTTON_SECONDARY} gap-2 border-[color:var(--color-semantic-error)] hover:border-[color:var(--color-semantic-error)] hover:bg-[color-mix(in_srgb,var(--color-semantic-error)_8%,transparent)]`}
    >
      {/* The same filled dot the live banner uses. There is no broadcast glyph
          in the icon set, and inventing a second live mark would leave the
          system with two. */}
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-[color:var(--color-semantic-error)]" />
      {t("goLive")}
    </Link>
  );
};

export const AddVideoLink = ({ label }: { label?: string }) => {
  const t = useTranslations("Videos");

  return (
    <Link href="/videos/new" className={`${BUTTON_PRIMARY} gap-2`}>
      <UiIcon name="plus" className="size-[var(--icon-size-xs)]" />
      {label ?? t("addVideo")}
    </Link>
  );
};
