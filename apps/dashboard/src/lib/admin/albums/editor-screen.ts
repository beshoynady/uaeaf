import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { isMongoId } from "@/lib/admin/request-shapes";
import type { AppLocale } from "@/i18n/routing";
import { pickPeople, readPeople } from "./people";
import { toAdminAlbum, toAlbumPhotos } from "./to-admin-album";
import type { AdminAlbum, AlbumPhoto, PersonOption } from "./types";

/**
 * What the album form reads before it draws.
 *
 * `id: null` is a new album. Four outcomes are kept apart — refused,
 * unreachable, gone, and the form — because a 404 and a 403 send a reader to
 * two different places (the video editor's reasoning, unchanged).
 */
export interface AlbumPermissions {
  canUpdate: boolean;
  canPublish: boolean;
  canDelete: boolean;
  /** `mediaAssets:Create` — the upload is a media-library write. */
  canUpload: boolean;
}

export type AlbumEditorScreen =
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "notFound" }
  | {
      status: "ready";
      data: {
        record: AdminAlbum | null;
        /** `null` when the library could not be read: the form still opens,
         *  and the photo section says why it is empty rather than claiming the
         *  album has none. */
        photos: AlbumPhoto[] | null;
        athletes: PersonOption[];
        clubs: PersonOption[];
        permissions: AlbumPermissions;
      };
    };

export const loadAlbumEditor = async (locale: AppLocale, id: string | null): Promise<AlbumEditorScreen> => {
  const grants = await readGrants(locale);
  // Creating needs Create; opening an existing one needs Read.
  if (!hasPermission(grants, "albums", id === null ? "Create" : "Read")) {
    return { status: "denied" };
  }

  const permissions: AlbumPermissions = {
    canUpdate: id === null ? hasPermission(grants, "albums", "Create") : hasPermission(grants, "albums", "Update"),
    canPublish: hasPermission(grants, "albums", "Publish"),
    canDelete: hasPermission(grants, "albums", "Delete"),
    canUpload: hasPermission(grants, "mediaAssets", "Create"),
  };

  if (id === null) {
    return { status: "ready", data: { record: null, photos: [], athletes: [], clubs: [], permissions } };
  }

  // A malformed id is an address that names nothing. Sent upstream it is a
  // cast failure, which would read as the service being down.
  if (!isMongoId(id)) return { status: "notFound" };

  let raw: unknown;
  try {
    raw = await fetchAsUser<unknown>(`/albums/${id}`, locale);
  } catch {
    return { status: "unavailable" };
  }
  // `GET /albums/:id` answers 200 with an empty body for an id that names no
  // album, and `fetchAsUser` reads that — like a 403 — as null. The grant was
  // checked above, so here it is the missing record.
  const record = raw === null ? null : toAdminAlbum(raw);
  if (!record) return { status: "notFound" };

  const [library, athletes, clubs] = await Promise.all([
    hasPermission(grants, "mediaAssets", "Read")
      ? fetchAsUser<unknown>("/media-assets", locale).catch(() => null)
      : Promise.resolve(null),
    record.athleteIds.length > 0 ? readPeople("athletes") : Promise.resolve([]),
    record.clubIds.length > 0 ? readPeople("clubs") : Promise.resolve([]),
  ]);

  return {
    status: "ready",
    data: {
      record,
      photos: library === null ? null : toAlbumPhotos(library, record.id),
      athletes: pickPeople(athletes, record.athleteIds),
      clubs: pickPeople(clubs, record.clubIds),
      permissions,
    },
  };
};
