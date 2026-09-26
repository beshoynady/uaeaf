"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { RowMenu } from "@/components/ui/row-menu";
import {
  AffiliationChip,
  CoverThumb,
  FeaturedStar,
  RowCount,
  RowDate,
  RowSlug,
  RowStatus,
  RowTitle,
  titleOf,
} from "./album-row-parts";
import type { Column } from "@/components/ui/data-table";
import type { RowMenuItem } from "@/components/ui/row-menu";
import type { AdminAlbum } from "@/lib/admin/albums/types";

/**
 * One page of albums, as a table from `xl` and as cards below it.
 *
 * The same two arrangements the video table uses and for the same measured
 * reason: seven columns plus a 96px cover need about 1100px, and the sidebar
 * takes roughly 330 of the window, so below `xl` the table would squeeze the
 * title into unreadability or hide columns behind a sideways scroll. Both are
 * built from the same parts in `album-row-parts`.
 *
 * Rows arrive sorted and paged; this draws what it is given.
 */
export const AlbumsTable = ({
  albums,
  covers,
  locale,
  canUpdate,
  busy,
  onFeature,
  rowMenu,
}: {
  albums: readonly AdminAlbum[];
  covers: ReadonlyMap<string, string>;
  locale: "ar" | "en";
  canUpdate: boolean;
  busy: boolean;
  onFeature: (album: AdminAlbum) => void;
  /** Only when the reader may act on a row: no options beats a menu of
   *  refusals. */
  rowMenu?: (album: AdminAlbum) => readonly RowMenuItem[];
}) => {
  const t = useTranslations("Albums");

  const cover = (album: AdminAlbum) => (album.coverImageId ? covers.get(album.coverImageId) : null);
  const star = (album: AdminAlbum) => (
    <FeaturedStar album={album} locale={locale} canUpdate={canUpdate} busy={busy} onFeature={onFeature} />
  );
  const menuFor = (album: AdminAlbum) => {
    const items = rowMenu?.(album) ?? [];
    return items.length > 0 ? (
      <RowMenu label={t("rowMenuLabel", { title: titleOf(album.title, locale) })} items={items} />
    ) : null;
  };

  const columns: Column<AdminAlbum>[] = [
    {
      key: "title",
      header: t("colAlbum"),
      render: (album) => (
        <span className="flex min-w-0 items-center gap-3">
          <CoverThumb url={cover(album)} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <RowTitle album={album} locale={locale} />
            <RowSlug album={album} />
          </span>
        </span>
      ),
    },
    { key: "affiliation", header: t("colAffiliation"), width: "10rem", render: (album) => <AffiliationChip album={album} locale={locale} /> },
    { key: "date", header: t("colDate"), width: "8rem", render: (album) => <RowDate album={album} locale={locale} /> },
    { key: "count", header: t("colPhotos"), width: "6.5rem", render: (album) => <RowCount album={album} /> },
    { key: "status", header: t("colStatus"), width: "6.5rem", render: (album) => <RowStatus album={album} /> },
    { key: "featured", header: t("colFeatured"), width: "5rem", render: star },
  ];
  if (rowMenu) {
    columns.push({ key: "actions", header: t("colActions"), width: "5rem", render: menuFor });
  }

  return (
    <>
      {/* Phone and tablet width: a list, announced as one. */}
      <ul aria-label={t("tableCaption")} className="flex flex-col gap-3 xl:hidden">
        {albums.map((album) => (
          <li
            key={album.id}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-3"
          >
            <div className="flex items-start gap-3">
              <CoverThumb url={cover(album)} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <RowTitle album={album} locale={locale} />
                <RowSlug album={album} />
              </div>
              {star(album)}
              {menuFor(album)}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-[color:var(--color-text-secondary)]">
              <AffiliationChip album={album} locale={locale} />
              <RowStatus album={album} />
              <RowDate album={album} locale={locale} />
              <RowCount album={album} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden xl:block">
        <DataTable
          caption={t("tableCaption")}
          columns={columns}
          rows={albums}
          rowKey={(album) => album.id}
          empty={t("noMatchesTitle")}
        />
      </div>
    </>
  );
};
