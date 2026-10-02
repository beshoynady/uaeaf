import { hasPermission } from "@/lib/auth/permissions";
import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { isMongoId } from "@/lib/admin/request-shapes";
import { toMediaOptions } from "@/lib/admin/media-options";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { EditorialState } from "@/lib/admin/editorial-state";
import type { AppLocale } from "@/i18n/routing";
import { readPublishMode, seasonPermissions } from "./seasons-screen";
import { toAdminSeason } from "./to-admin-season";
import type { SeasonPermissions } from "./seasons-screen";
import type { AdminSeason, PublishMode } from "./types";

/**
 * What the season form reads before it draws.
 *
 * `id: null` is a new season. Four outcomes are kept apart — refused,
 * unreachable, gone, and the form — because a 404 and a 403 send a reader to
 * two different places (the album editor's reasoning, unchanged).
 *
 * The three libraries the form picks from are read only where the reader may
 * read them. A refused library is an empty picker that says why, never a
 * refused form: the stored ids are sent back untouched on save, so a missing
 * grant cannot clear them.
 */

/** A document as the documents section offers it. `Document` has no title of
 *  its own — each language has its file — so the file name is its label. */
export interface DocumentOption {
  id: string;
  label: { ar: string; en: string };
}

/** A sponsor linked to this season through a `sponsorships` row
 *  (`targetType: 'Season'`). */
export interface SeasonSponsor {
  id: string;
  name: string;
}

export interface SeasonEditorPermissions extends SeasonPermissions {
  canReadMedia: boolean;
  canReadDocuments: boolean;
}

export type SeasonEditorScreen =
  | { status: "denied" }
  | { status: "unavailable" }
  | { status: "notFound" }
  | {
      status: "ready";
      data: {
        record: AdminSeason | null;
        images: MediaAssetOption[];
        documents: DocumentOption[];
        /** `null` when sponsorships could not be read. */
        sponsors: SeasonSponsor[] | null;
        permissions: SeasonEditorPermissions;
        publishMode: PublishMode;
        /** `GET /seasons/:id/editorial-state`: what this reader may do next,
         *  decided by the server. `null` for a new season or a failed read. */
        editorial: EditorialState | null;
      };
    };

type Row = Record<string, unknown>;

const rowsOf = (raw: unknown): Row[] =>
  Array.isArray(raw) ? raw.filter((entry): entry is Row => typeof entry === "object" && entry !== null) : [];

const fileName = (file: unknown, language: "ar" | "en"): string => {
  const variant = (file as Row | null)?.[language] as Row | undefined;
  return typeof variant?.filename === "string" ? variant.filename : "";
};

export const toDocumentOptions = (raw: unknown): DocumentOption[] =>
  rowsOf(raw).flatMap((row) => {
    const id = typeof row._id === "string" ? row._id : null;
    if (!id) return [];
    const ar = fileName(row.file, "ar");
    const en = fileName(row.file, "en");
    return [{ id, label: { ar: ar || en || id, en: en || ar || id } }];
  });

/** The sponsors whose sponsorship targets this season, by name in the
 *  reader's language. */
export const toSeasonSponsors = (
  sponsorships: unknown,
  sponsors: unknown,
  seasonId: string,
  locale: AppLocale,
): SeasonSponsor[] => {
  const names = new Map(
    rowsOf(sponsors).map((row) => {
      const name = (row.name ?? {}) as { ar?: unknown; en?: unknown };
      const own = name[locale];
      const other = name[locale === "ar" ? "en" : "ar"];
      return [row._id, typeof own === "string" && own ? own : typeof other === "string" ? other : ""];
    }),
  );
  return rowsOf(sponsorships)
    .filter((row) => row.targetType === "Season" && row.targetId === seasonId && typeof row.sponsorId === "string")
    .map((row) => ({ id: row.sponsorId as string, name: names.get(row.sponsorId) || (row.sponsorId as string) }));
};

const readIf = async (allowed: boolean, path: string, locale: AppLocale): Promise<unknown> =>
  allowed ? fetchAsUser<unknown>(path, locale).catch(() => null) : null;

export const loadSeasonEditor = async (locale: AppLocale, id: string | null): Promise<SeasonEditorScreen> => {
  const grants = await readGrants(locale);
  // Creating needs Create; opening an existing one needs Read.
  if (!hasPermission(grants, "seasons", id === null ? "Create" : "Read")) {
    return { status: "denied" };
  }

  let record: AdminSeason | null = null;
  if (id !== null) {
    // A malformed id is an address that names nothing. Sent upstream it is a
    // cast failure, which would read as the service being down.
    if (!isMongoId(id)) return { status: "notFound" };
    let raw: unknown;
    try {
      raw = await fetchAsUser<unknown>(`/seasons/${id}`, locale);
    } catch {
      return { status: "unavailable" };
    }
    // `GET /seasons/:id` answers 200 with an empty body for an id that names
    // no season, and `fetchAsUser` reads that — like a 403 — as null. The
    // grant was checked above, so here it is the missing record.
    record = raw === null ? null : toAdminSeason(raw);
    if (!record) return { status: "notFound" };
  }

  const canReadMedia = hasPermission(grants, "mediaAssets", "Read");
  const canReadDocuments = hasPermission(grants, "documents", "Read");
  const canReadSponsors = hasPermission(grants, "sponsorships", "Read") && hasPermission(grants, "sponsors", "Read");

  const [media, documents, sponsorships, sponsors, publishMode, editorial] = await Promise.all([
    readIf(canReadMedia, "/media-assets", locale),
    readIf(canReadDocuments, "/documents", locale),
    readIf(canReadSponsors && record !== null, "/sponsorships", locale),
    readIf(canReadSponsors && record !== null, "/sponsors", locale),
    readPublishMode(grants, locale),
    // The same read the article editor makes, typed the same way: the shape
    // is the shared publishing service's, not the season's.
    record ? fetchAsUser<EditorialState>(`/seasons/${record.id}/editorial-state`, locale).catch(() => null) : null,
  ]);

  const base = seasonPermissions(grants);
  return {
    status: "ready",
    data: {
      record,
      images: toMediaOptions(Array.isArray(media) ? media : null),
      documents: toDocumentOptions(documents),
      sponsors:
        record && sponsorships !== null && sponsors !== null
          ? toSeasonSponsors(sponsorships, sponsors, record.id, locale)
          : null,
      permissions: {
        ...base,
        // A new season is saved by `Create`, an existing one by `Update`.
        canUpdate: id === null ? base.canCreate : base.canUpdate,
        canReadMedia: canReadMedia && media !== null,
        canReadDocuments: canReadDocuments && documents !== null,
      },
      publishMode,
      editorial: (editorial as EditorialState | null) ?? null,
    },
  };
};
