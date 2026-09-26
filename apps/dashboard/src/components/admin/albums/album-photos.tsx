"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SettingsCard } from "@/components/ui/settings-card";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { InlineConfirm } from "./inline-confirm";
import { PhotoDetailsPanel } from "./photo-details-panel";
import { PhotoDropzone } from "./photo-dropzone";
import { PhotoGrid } from "./photo-grid";
import { UploadList } from "./upload-list";
import { isGeneratedAlt } from "@/lib/admin/albums/generated-alt";
import { useAlbumUploads } from "@/lib/admin/albums/use-album-uploads";
import { useAlbumWrite } from "@/lib/admin/albums/use-album-write";
import type { AdminAlbum, AlbumPhoto } from "@/lib/admin/albums/types";

/**
 * The album's photos: adding them, arranging them, choosing the cover, and
 * removing them.
 *
 * -- Every act here is its own write ---------------------------------------
 *
 * Unlike the fields above, nothing in this section waits for Save. A photo is
 * stored the moment its upload finishes, an order the moment it is changed, a
 * cover the moment it is chosen. Holding them for Save would mean a reload
 * after an upload loses nothing but a reorder loses everything, which is two
 * rules for one grid.
 *
 * -- The order is always sent whole ----------------------------------------
 *
 * `PATCH /albums/:id/photos/order` must list every photo exactly once. The
 * grid is changed first, so the move is seen at once; if the write is refused
 * the grid goes back to the order that was stored, and the refusal says why.
 * While a write is in flight the move buttons and the drag are off, so two
 * orders cannot race each other to the server.
 *
 * After an upload batch settles the order is sent once more. The API stores a
 * new photo at position 0 (a multipart `displayOrder` cannot pass `@IsInt`), so
 * without it the new photos would sort among the first ones rather than after
 * the last.
 */
export const AlbumPhotos = ({
  album,
  photos: stored,
  canUpdate,
  canUpload,
  locale,
}: {
  album: AdminAlbum;
  /** `null` when the media library could not be read. */
  photos: AlbumPhoto[] | null;
  canUpdate: boolean;
  canUpload: boolean;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Albums");
  const router = useRouter();
  const toast = useToast();
  const { busy, failure, send, json, describe } = useAlbumWrite();

  const [photos, setPhotos] = useState<AlbumPhoto[]>(stored ?? []);
  const [source, setSource] = useState(stored);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // A fresh server read replaces the local copy — adjusted during render, not
  // in an effect, so the grid never draws one frame of the stale order.
  if (stored !== source) {
    setSource(stored);
    setPhotos(stored ?? []);
    setSelected((current) => new Set([...current].filter((id) => stored?.some((photo) => photo.id === id))));
  }

  // The completion handlers below run after awaits; they must read the grid
  // as it is then, not as it was when they were created.
  const current = useRef(photos);
  current.current = photos;

  const saveOrder = async (order: string[], options: { quiet?: boolean } = {}) => {
    const before = current.current;
    const byId = new Map(before.map((photo) => [photo.id, photo]));
    setPhotos(order.flatMap((id) => byId.get(id) ?? []));
    const outcome = await send(`/api/admin/albums/${album.id}/photos/order`, json({ photoIds: order }, "PATCH"), {
      refresh: false,
    });
    if (!outcome.ok) {
      setPhotos(before);
      return;
    }
    if (!options.quiet) {
      toast.show({ tone: "success", title: t("orderSavedToast"), source: "api", dedupeKey: "albums:order" });
    }
  };

  const uploads = useAlbumUploads({
    albumId: album.id,
    albumTitle: album.title,
    photoCount: photos.length,
    onUploaded: (photo) => setPhotos((list) => [...list, photo]),
    onSettled: () => {
      const order = current.current.map((photo) => photo.id);
      void (async () => {
        if (order.length > 0) await saveOrder(order, { quiet: true });
        // The album's count and, for a first photo, its cover changed upstream.
        router.refresh();
      })();
    },
  });

  const setCover = async (photoId: string) => {
    const outcome = await send(`/api/admin/albums/${album.id}/cover`, json({ photoId }, "PATCH"));
    if (outcome.ok) toast.show({ tone: "success", title: t("coverSavedToast"), source: "api", dedupeKey: "albums:cover" });
  };

  const removeSelected = async () => {
    // The selection as it is at the confirming press (CLAUDE.md §31).
    const ids = [...selected].filter((id) => current.current.some((photo) => photo.id === id));
    const removed: string[] = [];
    // One at a time: the API has no batch delete, and each removal can move
    // the cover, which the next one must see.
    for (const id of ids) {
      const outcome = await send(`/api/admin/albums/${album.id}/photos/${id}`, { method: "DELETE" }, { refresh: false });
      if (!outcome.ok) break;
      removed.push(id);
    }
    setConfirmingDelete(false);
    setPhotos((list) => list.filter((photo) => !removed.includes(photo.id)));
    setSelected((currentSelection) => new Set([...currentSelection].filter((id) => !removed.includes(id))));
    if (detailsId && removed.includes(detailsId)) setDetailsId(null);
    if (removed.length > 0) {
      toast.show({
        tone: "success",
        title: t("photosDeletedToast", { count: removed.length }),
        source: "api",
        dedupeKey: "albums:photos-deleted",
      });
      router.refresh();
    }
  };

  const fallbackCount = photos.filter((photo) => isGeneratedAlt(photo.altText)).length;
  const detailsIndex = photos.findIndex((photo) => photo.id === detailsId);
  const details = detailsIndex >= 0 ? photos[detailsIndex] : null;

  return (
    <SettingsCard title={t("sectionPhotos")} description={t("sectionPhotosHint")} as="h3">
      {canUpload ? (
        <PhotoDropzone disabled={false} onFiles={uploads.add} />
      ) : (
        <p className="text-body-sm text-[color:var(--color-text-secondary)]">{t("uploadNotAllowed")}</p>
      )}

      <UploadList
        items={uploads.items}
        describe={describe}
        onRetry={uploads.retry}
        onDismiss={uploads.dismiss}
        onClearDone={uploads.clearDone}
      />

      <WriteFailure message={failure} />

      {stored === null ? (
        <EmptyState icon="circle-alert" tone="error" title={t("photosUnavailableTitle")} body={t("photosUnavailableBody")} />
      ) : photos.length === 0 ? (
        <EmptyState icon="image" title={t("noPhotosTitle")} body={t("noPhotosBody")} />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* The photos whose description is still the numbered fallback —
                not "photos without alt text": the upload makes that state
                impossible, and the honest count is of the ones nobody has
                described yet. */}
            <p
              className={`text-body-sm ${
                fallbackCount > 0
                  ? "font-medium text-[color:var(--color-semantic-warning-text)]"
                  : "text-[color:var(--color-text-secondary)]"
              }`}
            >
              {t("generatedAltCount", { count: fallbackCount, total: photos.length })}
            </p>

            {canUpdate ? (
              <div className="flex flex-wrap items-center gap-2">
                {selected.size > 0 ? (
                  <Button variant="ghost" onClick={() => setSelected(new Set())}>
                    {t("clearSelection")}
                  </Button>
                ) : null}
                <Button
                  variant="destructive"
                  disabled={selected.size === 0 || busy}
                  onClick={() => setConfirmingDelete(true)}
                >
                  {t("deleteSelected", { count: selected.size })}
                </Button>
              </div>
            ) : null}
          </div>

          {confirmingDelete ? (
            <InlineConfirm
              message={t("deletePhotosConfirm", { count: selected.size })}
              confirmLabel={t("confirmDelete")}
              cancelLabel={t("cancel")}
              busy={busy}
              onConfirm={() => void removeSelected()}
              onCancel={() => setConfirmingDelete(false)}
            />
          ) : null}

          {canUpdate ? <p className="text-caption text-[color:var(--color-text-muted)]">{t("reorderHint")}</p> : null}

          <div className={details ? "grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]" : "flex flex-col"}>
            <PhotoGrid
              photos={photos}
              coverId={album.coverImageId}
              selected={selected}
              detailsId={detailsId}
              canUpdate={canUpdate}
              busy={busy}
              locale={locale}
              onReorder={(order) => void saveOrder(order)}
              onCover={(photoId) => void setCover(photoId)}
              onSelect={(photoId, value) =>
                setSelected((currentSelection) => {
                  const next = new Set(currentSelection);
                  if (value) next.add(photoId);
                  else next.delete(photoId);
                  return next;
                })
              }
              onDetails={(photoId) => setDetailsId((open) => (open === photoId ? null : photoId))}
            />
            {details ? (
              <PhotoDetailsPanel
                photo={details}
                position={detailsIndex + 1}
                locale={locale}
                onClose={() => setDetailsId(null)}
              />
            ) : null}
          </div>
        </>
      )}
    </SettingsCard>
  );
};
