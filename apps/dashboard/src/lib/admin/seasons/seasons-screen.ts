import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import type { PermissionGrant } from "@/lib/auth/permissions";
import type { AppLocale } from "@/i18n/routing";
import { countInSeason } from "./list-filters";
import { publishModeOf } from "./publish-mode";
import { toAdminSeasonList } from "./to-admin-season";
import type { AdminSeason, PublishMode, SeasonContent } from "./types";

/**
 * What the seasons list reads before it draws.
 *
 * Decided on the server, as every administration screen decides it: a reader
 * without `seasons:Read` never receives the list, and a write is offered only
 * where the API would accept it. Hiding a button is presentation; the refusal
 * itself is upstream.
 */
export interface SeasonPermissions {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
}

export type SeasonsScreen =
  | { status: "denied" }
  | { status: "unavailable" }
  | {
      status: "ready";
      data: {
        seasons: AdminSeason[];
        /** Keyed by season id. */
        content: Map<string, SeasonContent>;
        permissions: SeasonPermissions;
        publishMode: PublishMode;
      };
    };

export const seasonPermissions = (grants: readonly PermissionGrant[]): SeasonPermissions => ({
  canCreate: hasPermission(grants, "seasons", "Create"),
  canUpdate: hasPermission(grants, "seasons", "Update"),
  canDelete: hasPermission(grants, "seasons", "Archive"),
  canPublish: hasPermission(grants, "seasons", "Publish"),
});

/**
 * The approval policy for seasons, read only when the reader may read
 * policies. Refused or unreachable, the mode is `unknown` and the API decides
 * at the publish — which it does in every case anyway (ADR-0125).
 */
export const readPublishMode = async (
  grants: readonly PermissionGrant[],
  locale: AppLocale,
): Promise<PublishMode> => {
  if (!hasPermission(grants, "workflowPolicies", "Read")) return "unknown";
  try {
    const policy = await fetchAsUser<unknown>("/workflow-policies/seasons/Edit", locale);
    return publishModeOf(policy, true);
  } catch {
    return "unknown";
  }
};

/** One date field of every row of a library, or `null` when the library was
 *  not readable. `GET /videos` has answered both a bare array and an
 *  `{ items }` page (see `toAdminVideoList`), so both are read. */
const instantsOf = (raw: unknown, field: "eventDate" | "publishedAt"): (string | null)[] | null => {
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: unknown } | null)?.items)
      ? (raw as { items: unknown[] }).items
      : null;
  if (!rows) return null;
  return rows.map((row) => {
    const value = (row as Record<string, unknown> | null)?.[field];
    return typeof value === "string" ? value : null;
  });
};

const readLibrary = async (
  grants: readonly PermissionGrant[],
  resource: "albums" | "videos",
  locale: AppLocale,
): Promise<unknown> =>
  hasPermission(grants, resource, "Read") ? fetchAsUser<unknown>(`/${resource}`, locale).catch(() => null) : null;

export const loadSeasonsScreen = async (locale: AppLocale): Promise<SeasonsScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "seasons", "Read")) {
    return { status: "denied" };
  }

  let rows: unknown;
  try {
    rows = await fetchAsUser<unknown>("/seasons", locale);
  } catch {
    // The API is down or restarting. Telling the reader they lack a
    // permission would send them to an administrator to fix a network.
    return { status: "unavailable" };
  }
  // `fetchAsUser` answers null only for a 403 here — the list route always
  // returns an array.
  if (rows === null) {
    return { status: "denied" };
  }

  const seasons = toAdminSeasonList(rows);
  const [albums, videos, publishMode] = await Promise.all([
    readLibrary(grants, "albums", locale),
    readLibrary(grants, "videos", locale),
    readPublishMode(grants, locale),
  ]);
  const albumDates = instantsOf(albums, "eventDate");
  const videoDates = instantsOf(videos, "publishedAt");

  return {
    status: "ready",
    data: {
      seasons,
      content: new Map(
        seasons.map((season) => [
          season.id,
          { albums: countInSeason(season, albumDates), videos: countInSeason(season, videoDates) },
        ]),
      ),
      permissions: seasonPermissions(grants),
      publishMode,
    },
  };
};
