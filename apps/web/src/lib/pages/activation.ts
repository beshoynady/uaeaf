import { getTranslations } from "next-intl/server";
import { fetchPublic } from "@/lib/api/public-client";
import type { AppLocale } from "@/i18n/routing";
import type { LocalizedText } from "@/lib/api/types";

/**
 * Whether a page is being served at its URL (ADR-0102 §D2).
 *
 * ── Why `false` is the only withholding answer ────────────────────────────
 *
 * A record that says nothing about the field is **served**. Three states reach
 * this function and only one of them means "withheld":
 *
 * - `isActive: false` — the federation switched this page off. Withheld.
 * - `isActive: true` — switched on. Served.
 * - the field absent — a row written before the field existed. The backfill
 *   makes these explicit, but a live federation page must not go dark because a
 *   migration had not run yet, so absence reads as served.
 *
 * A **null record** is not this function's business. "Never saved" and "nothing
 * published" are the route's own cases and it answers them with a 404 or its own
 * screen; conflating them here would make one gate answer two questions.
 */
export const isServed = (record: { isActive?: boolean } | null | undefined): boolean =>
  record?.isActive !== false;

/**
 * The one line a withheld page shows.
 *
 * `siteSettings.maintenanceMessage` for this locale, which is the federation's
 * own wording, written once (ADR-0102 §D5). `Preparing.status` is the fallback
 * for the ordinary case where nobody has written one — and for the case where
 * the API is unreachable, which is the moment a hard failure here would be worst.
 *
 * No per-page message: the sentence is the same sentence on every page, and a
 * field per page is fifteen places for it to go stale.
 */
export const withheldMessage = async (locale: AppLocale): Promise<string> => {
  const settings = await fetchPublic<{ maintenanceMessage: LocalizedText | null }>("/site-settings/public");
  const written = settings?.maintenanceMessage?.[locale]?.trim();
  if (written) {
    return written;
  }

  const t = await getTranslations({ locale });
  return t("Preparing.status");
};
