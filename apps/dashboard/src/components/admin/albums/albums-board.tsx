"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { WriteFailure } from "@/components/ui/write-failure";
import { AddAlbumLink } from "./album-links";
import { AlbumsFilters } from "./albums-filters";
import { AlbumsTable } from "./albums-table";
import { InlineConfirm } from "./inline-confirm";
import { titleOf } from "./album-row-parts";
import { byNewestOccasion, isFiltering, matchesFilters, NO_FILTERS, periodsOf } from "@/lib/admin/albums/list-filters";
import { useAlbumWrite } from "@/lib/admin/albums/use-album-write";
import type { AlbumFilters } from "@/lib/admin/albums/list-filters";
import type { AdminAlbum } from "@/lib/admin/albums/types";
import type { RowMenuItem } from "@/components/ui/row-menu";

/**
 * The albums list: its filters, its page of rows, and the writes that happen
 * without leaving it — featuring, publishing and deleting.
 *
 * Editing is not one of them. The title in each row is the link to the album's
 * own page, which is where its fields and its photos are.
 */

/** Ten rows, the video list's number and for its reason: the common case is
 *  one page, and the filters stay on screen while the list is scanned. */
const PAGE_SIZE = 10;

export const AlbumsBoard = ({
  albums,
  covers,
  canCreate,
  canUpdate,
  canDelete,
  canPublish,
  locale,
}: {
  albums: readonly AdminAlbum[];
  covers: ReadonlyMap<string, string>;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  locale: "ar" | "en";
}) => {
  const t = useTranslations("Albums");
  const toast = useToast();
  const { busy, failure, send, json } = useAlbumWrite();

  const [filters, setFilters] = useState<AlbumFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<AdminAlbum | null>(null);

  // Sorted before it is paged: sorting each page on its own would put newer
  // albums on page two.
  const shown = useMemo(
    () => albums.filter((album) => matchesFilters(album, filters)).sort(byNewestOccasion),
    [albums, filters],
  );
  const periods = useMemo(() => periodsOf(albums), [albums]);

  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE));
  // Clamped rather than reset in an effect: a narrower filter on page 3 must
  // not show an empty table that reads as "no matches".
  const current = Math.min(page, pageCount);
  const rows = shown.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const narrow = (next: AlbumFilters) => {
    setPage(1);
    setFilters(next);
  };

  const done = (title: string, message: string, key: string) =>
    toast.show({ tone: "success", title: message, description: title, source: "api", dedupeKey: key });

  const feature = async (album: AdminAlbum) => {
    const outcome = await send(`/api/admin/albums/${album.id}/featured`, json({}, "PATCH"));
    if (outcome.ok) done(titleOf(album.title, locale), t("featuredToast"), "albums:featured");
  };

  const publish = async (album: AdminAlbum) => {
    const outcome = await send(`/api/admin/albums/${album.id}/publish`, json({}, "PATCH"));
    if (outcome.ok) done(titleOf(album.title, locale), t("publishedToast"), `albums:${album.id}:published`);
  };

  const remove = async () => {
    // Read at the confirming press, not at the press that asked (CLAUDE.md §31).
    const target = deleting;
    if (!target) return;
    const outcome = await send(`/api/admin/albums/${target.id}`, { method: "DELETE" });
    setDeleting(null);
    if (outcome.ok) done(titleOf(target.title, locale), t("deletedToast"), "albums:deleted");
  };

  const rowMenu = (album: AdminAlbum): RowMenuItem[] => [
    ...(canPublish && album.publicationState !== "Published"
      ? [{ key: "publish", label: t("publish"), disabled: busy, onSelect: () => void publish(album) }]
      : []),
    ...(canDelete
      ? [{ key: "delete", label: t("deleteAlbum"), danger: true, disabled: busy, onSelect: () => setDeleting(album) }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <WriteFailure message={failure} />

      <AlbumsFilters filters={filters} periods={periods} onChange={narrow} />

      {deleting ? (
        <InlineConfirm
          message={t("deleteConfirmBody", { title: titleOf(deleting.title, locale) })}
          confirmLabel={t("confirmDelete")}
          cancelLabel={t("cancel")}
          busy={busy}
          onConfirm={() => void remove()}
          onCancel={() => setDeleting(null)}
        />
      ) : null}

      {/* Two different nothings, two different next moves. */}
      {albums.length === 0 ? (
        <EmptyState
          icon="image"
          title={t("noAlbumsTitle")}
          body={t("noAlbumsBody")}
          action={canCreate ? <AddAlbumLink label={t("addFirstAlbum")} /> : undefined}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon="search"
          title={t("noMatchesTitle")}
          body={t("noMatchesBody")}
          action={
            <Button variant="secondary" onClick={() => narrow(NO_FILTERS)}>
              {t("clearFilters")}
            </Button>
          }
        />
      ) : (
        <>
          <AlbumsTable
            albums={rows}
            covers={covers}
            locale={locale}
            canUpdate={canUpdate}
            busy={busy}
            onFeature={(album) => void feature(album)}
            rowMenu={canPublish || canDelete ? rowMenu : undefined}
          />

          <Pagination
            page={current}
            pageCount={pageCount}
            onChange={setPage}
            busy={busy}
            labels={{
              label: t("pagerLabel"),
              previous: t("pagerPrevious"),
              next: t("pagerNext"),
              position: t("pagerPosition", { page: current, total: pageCount }),
            }}
          />

          {isFiltering(filters) ? (
            <div>
              <Button variant="ghost" onClick={() => narrow(NO_FILTERS)}>
                {t("clearFilters")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
