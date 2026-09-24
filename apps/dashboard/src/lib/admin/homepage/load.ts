import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { toHomepageSections } from "./sections";
import type { HomepageSection } from "./sections";
import type { AppLocale } from "@/i18n/routing";

/**
 * The homepage's sections, read for the management screen and for the rail
 * that every section editor carries.
 *
 * One loader for both, because they show the same list and must not be able to
 * disagree about its order or about which sections are hidden.
 */
export type HomepageScreen =
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "noPage" }
  | { status: "ready"; data: { pageId: string; sections: HomepageSection[]; canUpdate: boolean } };

const HOMEPAGE_SLUG = "home";

interface SectionRow {
  _id: string;
  sectionType: string;
  displayOrder?: number;
  enabled?: boolean;
}

export const loadHomepageSections = async (locale: AppLocale): Promise<HomepageScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "pageSections", "Read")) {
    return { status: "denied" };
  }

  try {
    const page = await fetchAsUser<{ id?: unknown }>(`/pages/public/${HOMEPAGE_SLUG}`, locale);
    if (!page || typeof page.id !== "string") return { status: "noPage" };

    const rows = await fetchAsUser<SectionRow[]>(`/page-sections/by-page/${page.id}`, locale);
    // `fetchAsUser` answers null only for a 403 — a genuine refusal.
    if (rows === null) return { status: "denied" };
    if (!Array.isArray(rows)) return { status: "unavailable" };

    return {
      status: "ready",
      data: {
        pageId: page.id,
        sections: toHomepageSections(rows),
        // The switches and the arrows are offered only where the API would
        // accept the write. Hiding them is presentation; the refusal is
        // upstream, and the route handler checks it again.
        canUpdate: hasPermission(grants, "pageSections", "Update"),
      },
    };
  } catch {
    // The API is down, restarting or slow. Telling the reader they lack a
    // permission would send them to an administrator to fix a network.
    return { status: "unavailable" };
  }
};
