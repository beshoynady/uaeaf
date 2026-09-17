import { displayName } from "@uaeaf/content/sponsors";
import type { AppLocale } from "@/i18n/routing";
import type { OrganizationNamePublic } from "@/lib/api/types";

/**
 * An organisation's name as it writes itself (ADR-0085 D4).
 *
 * The page's language when the organisation has a name in it; otherwise its
 * other name, unchanged, inside `<bdi lang>`: isolated so the punctuation and
 * digits around it do not reorder, and declared so a screen reader pronounces
 * it in its own language instead of spelling English with Arabic phonetics.
 * It takes its own language's typeface too (Chapter 4 §4.3: Alexandria for
 * Arabic, IBM Plex Sans for English), since the page's is chosen for the page.
 */

/** Chapter 4 §4.3's family for a text's own language. */
export const FONT_FOR: Record<"ar" | "en", string> = { ar: "font-arabic", en: "font-latin" };

export const OrganizationName = ({
  name,
  locale,
  className,
}: {
  name: OrganizationNamePublic;
  locale: AppLocale;
  className?: string;
}) => {
  const shown = displayName(name, locale);
  if (!shown) return null;
  return shown.isForeign ? (
    <bdi lang={shown.lang} className={`${FONT_FOR[shown.lang]}${className ? ` ${className}` : ""}`}>
      {shown.text}
    </bdi>
  ) : (
    <span className={className}>{shown.text}</span>
  );
};
