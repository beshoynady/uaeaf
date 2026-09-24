import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";
import { toAdminVideoList } from "./to-admin-video";
import { toMediaOptions } from "@/lib/admin/media-options";
import type { ActiveLiveStream, AdminVideo } from "./types";

/**
 * What the videos screen reads before it draws.
 *
 * Decided on the server, as every other administration screen decides it: a
 * reader without `videos:Read` never receives the list, and the write
 * affordances are offered only where the API would accept the write. Hiding a
 * button is presentation; the refusal itself is upstream.
 */
export type VideosScreen =
  | { status: "denied" }
  | { status: "unavailable" }
  | {
      status: "ready";
      data: {
        videos: AdminVideo[];
        live: ActiveLiveStream | null;
        /** `thumbnailId` to a servable URL, for the rows that carry one. */
        thumbnails: Map<string, string>;
        canCreate: boolean;
        canUpdate: boolean;
        canDelete: boolean;
      };
    };

export const loadVideosScreen = async (locale: AppLocale): Promise<VideosScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "videos", "Read")) {
    return { status: "denied" };
  }

  // The broadcast is a public read, so a failure there costs the banner and
  // not the screen; the list is the screen.
  let rows: unknown;
  let live: ActiveLiveStream | null;
  let assets: unknown[] | null;
  try {
    // The media library is read for the row thumbnails only. A reader who
    // cannot see it gets a table of empty frames rather than no table: a
    // picture is not what the screen is for.
    [rows, live, assets] = await Promise.all([
      fetchAsUser<unknown>("/videos", locale),
      fetchAsUser<ActiveLiveStream | null>("/live-streams/public/active", locale).catch(() => null),
      fetchAsUser<unknown[]>("/media-assets", locale).catch(() => null),
    ]);
  } catch {
    // The API is down, restarting or slow. Telling the reader they lack a
    // permission would send them to an administrator to fix a network.
    return { status: "unavailable" };
  }
  // `fetchAsUser` answers null only for a 403 — a genuine refusal.
  if (rows === null) {
    return { status: "denied" };
  }

  return {
    status: "ready",
    data: {
      videos: toAdminVideoList(rows),
      live: live ?? null,
      thumbnails: new Map(toMediaOptions(assets).map((asset) => [asset.id, asset.url])),
      canCreate: hasPermission(grants, "videos", "Create"),
      canUpdate: hasPermission(grants, "videos", "Update"),
      canDelete: hasPermission(grants, "videos", "Delete"),
    },
  };
};
