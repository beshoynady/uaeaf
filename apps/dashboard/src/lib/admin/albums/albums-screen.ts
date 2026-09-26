import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";
import { toAdminAlbumList } from "./to-admin-album";
import type { AdminAlbum } from "./types";

/**
 * What the albums list reads before it draws.
 *
 * Decided on the server, as every administration screen decides it: a reader
 * without `albums:Read` never receives the list, and a write is offered only
 * where the API would accept it. Hiding a button is presentation; the refusal
 * itself is upstream.
 */
export type AlbumsScreen =
  | { status: "denied" }
  | { status: "unavailable" }
  | {
      status: "ready";
      data: {
        albums: AdminAlbum[];
        /** `coverImageId` to a servable URL, for the albums that have one. */
        covers: Map<string, string>;
        canCreate: boolean;
        canUpdate: boolean;
        canDelete: boolean;
        canPublish: boolean;
      };
    };

/** `GET /media-assets/public` resolves at most fifty ids per request. */
const COVER_BATCH = 50;

/**
 * The covers, through the public resolver rather than the whole library.
 *
 * `GET /media-assets` returns every asset of every album — thousands of photos
 * to find a few dozen covers. The public route takes the ids and answers only
 * those. A cover that is hidden or archived is absent from its answer, which
 * is right: the row then draws the placeholder a visitor would also see.
 */
const readCovers = async (albums: readonly AdminAlbum[], locale: AppLocale): Promise<Map<string, string>> => {
  const ids = [...new Set(albums.flatMap((album) => album.coverImageId ?? []))];
  const batches = Array.from({ length: Math.ceil(ids.length / COVER_BATCH) }, (_, index) =>
    ids.slice(index * COVER_BATCH, (index + 1) * COVER_BATCH),
  );

  const answers = await Promise.all(
    batches.map((batch) =>
      fetchAsUser<unknown[]>(`/media-assets/public?ids=${batch.join(",")}`, locale).catch(() => null),
    ),
  );

  const covers = new Map<string, string>();
  for (const entry of answers.flat()) {
    const asset = entry as { id?: unknown; file?: { url?: unknown } } | null;
    if (typeof asset?.id === "string" && typeof asset.file?.url === "string") covers.set(asset.id, asset.file.url);
  }
  return covers;
};

export const loadAlbumsScreen = async (locale: AppLocale): Promise<AlbumsScreen> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "albums", "Read")) {
    return { status: "denied" };
  }

  let rows: unknown;
  try {
    rows = await fetchAsUser<unknown>("/albums", locale);
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

  const albums = toAdminAlbumList(rows);
  return {
    status: "ready",
    data: {
      albums,
      covers: await readCovers(albums, locale),
      canCreate: hasPermission(grants, "albums", "Create"),
      canUpdate: hasPermission(grants, "albums", "Update"),
      canDelete: hasPermission(grants, "albums", "Delete"),
      canPublish: hasPermission(grants, "albums", "Publish"),
    },
  };
};
