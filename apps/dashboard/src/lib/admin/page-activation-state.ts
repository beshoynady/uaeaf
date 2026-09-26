import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { findActivatablePage } from "@/lib/admin/activatable-pages";
import type { AppLocale } from "@/i18n/routing";

/** What `PageActivationBar` needs, resolved on the server. */
export interface PageActivationState {
  entity: string;
  isActive: boolean;
  canPublish: boolean;
  saved: boolean;
}

/**
 * Reads one page's live state and this reader's publish grant.
 *
 * For the screens that are **not** a page editor — the newsroom worklist and the
 * video library — whose public listing page nevertheless has a hero record and a
 * switch. Those screens are where someone managing that part of the site
 * actually is, so the switch is reachable from there as well as from `/pages`
 * (owner brief §3).
 *
 * Two views of one field, not two sources of truth: both read the same row and
 * both write through `/api/admin/page-activation/<entity>`, and each screen
 * re-reads after a change. The alternative was a second stored flag, which is
 * the thing ADR-0102 §D2 exists to avoid.
 *
 * Fails to "no bar" rather than to an error. The read is a `@Public()` GET
 * upstream, so `null` means the API is unreachable — and a screen that will not
 * open because a status bar could not be drawn is worse than a screen without
 * the bar.
 */
export const loadPageActivation = async (
  entity: string,
  locale: AppLocale,
): Promise<PageActivationState | null> => {
  const page = findActivatablePage(entity);
  if (!page || page.shape !== "singleton") {
    return null;
  }

  const [record, grants] = await Promise.all([
    fetchAsUser<{ isActive?: boolean } | null>(page.apiPath, locale),
    readGrants(locale),
  ]);

  return {
    entity,
    // Absent reads as served, matching the schema default: a page whose row
    // predates the field must not read as withheld.
    isActive: record?.isActive !== false,
    canPublish: hasPermission(grants, entity, "Publish"),
    saved: record != null,
  };
};
