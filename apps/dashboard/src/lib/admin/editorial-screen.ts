import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { toMediaOptions } from "@/lib/admin/media-options";
import { editorialStatePath, findEditorialEntity } from "@/lib/admin/editorial-entities";
import { selectRecord, type EditorialRecord } from "@/lib/admin/editorial-record";
import type { EditorialState } from "@/lib/admin/editorial-state";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { AppLocale } from "@/i18n/routing";

/** What an editorial screen draws in place of its editor. */
export type EditorialScreenAbsence = { status: "denied" } | { status: "absent"; requested: boolean };

export type EditorialScreen<T extends EditorialRecord> =
  | EditorialScreenAbsence
  | {
      status: "ready";
      record: T;
      images: MediaAssetOption[];
      canEdit: boolean;
      canReadMedia: boolean;
      editorial: EditorialState | null;
    };

/**
 * Everything an editorial screen reads before it draws (ADR-0070), as the
 * President's Message screen settled it.
 *
 * - The permission check is the enforcement half of the pair, decided on the
 *   server before any of the record reaches the browser. Hiding the link in
 *   the navigation is presentation: anyone can type the URL.
 * - Two grants, two jobs. The editor (`<type>:Update`) writes; the approver
 *   (`workflowInstances:Approve`) decides and needs to read what they are
 *   approving, so the screen opens for either and the editor goes read-only
 *   for the one who cannot write. Reading alone opens nothing (owner decision
 *   2026-09-12).
 * - The record and the image library are independent grants. `mediaAssets`
 *   refused is an absence, not an error: the picker then offers upload only.
 * - Refused is not absent. `null` is the API refusing; an empty list is a
 *   record nobody has created.
 * - The status panel's state is read after the record, because it is keyed by
 *   the record's id. Refused or unavailable means no panel rather than no
 *   screen: the editor is still usable.
 */
export const loadEditorialScreen = async <T extends EditorialRecord>(
  entityType: string,
  locale: AppLocale,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<EditorialScreen<T>> => {
  const entity = findEditorialEntity(entityType);
  if (!entity) {
    throw new Error(`"${entityType}" has no editorial screen registered in EDITORIAL_ENTITIES.`);
  }

  const grants = await readGrants(locale);
  const canEdit = hasPermission(grants, entity.entityType, "Update");
  const canReview = hasPermission(grants, "workflowInstances", "Approve");

  if (!canEdit && !canReview) {
    return { status: "denied" };
  }

  const [records, media] = await Promise.all([
    fetchAsUser<T[]>(entity.apiPath, locale),
    fetchAsUser<unknown[]>("/media-assets", locale),
  ]);

  if (records === null) {
    return { status: "denied" };
  }

  // `?record=<id>` opens one specific row — how a test record is rehearsed on
  // without touching the real page.
  const wanted = (await searchParams).record;
  const requested = typeof wanted === "string" ? wanted : null;
  const record = selectRecord(records, requested);

  if (record === null) {
    return { status: "absent", requested: requested !== null };
  }

  // Through the registry, not a literal: it already owns this path for the
  // route handler that serves the browser's own re-reads.
  const editorial = await fetchAsUser<EditorialState>(editorialStatePath(entity, record._id), locale);

  return {
    status: "ready",
    record,
    // Mapped, not forwarded: the API's id is `_id`, and the picker matches the
    // stored image by `id`.
    images: toMediaOptions(media),
    canEdit,
    canReadMedia: media !== null,
    editorial,
  };
};
