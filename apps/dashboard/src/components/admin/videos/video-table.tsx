"use client";

import { useTranslations } from "next-intl";
import { DataTable } from "@/components/ui/data-table";
import { RowMenu } from "@/components/ui/row-menu";
import { RowDate, RowPlatform, RowStatus, RowStill, RowTitle, RowUrl, titleOf } from "./video-row-parts";
import type { Column } from "@/components/ui/data-table";
import type { RowMenuItem } from "@/components/ui/row-menu";
import type { AdminVideo } from "@/lib/admin/videos/types";

/**
 * Every video, in the order a visitor gets them.
 *
 * -- Two arrangements of one list --------------------------------------------
 *
 * A table that does not fit puts every column after the title behind a
 * sideways scroll nothing advertises. So below `xl` each row becomes a card,
 * and from `xl` up it is the table the design draws.
 *
 * `xl`, not `md`, and the number is measured rather than chosen: seven columns
 * plus a 96px still need about 1100px, and the sidebar takes roughly 330 of
 * the window. At 1024 the title column was squeezed to 39px — the table
 * technically fitted and was unreadable, which is worse than the scrollbar it
 * replaced. At 1280 the title gets 295px and at 1440 it gets 455.
 *
 * Both are built from the same rows, the same link and the same `rowMenu`,
 * with the cells themselves coming from `video-row-parts`. Only the boxes
 * differ — there is no second definition of what a status badge or a date is.
 *
 * -- Why there is no drag handle --------------------------------------------
 *
 * The approved design draws one ("اسحب الصفوف لإعادة الترتيب", PDF p. 9) and it
 * is deliberately not built: the owner removed manual ordering on 2026-09-23.
 * The library and this table are both `publishedAt` descending, so what an
 * editor sees here IS what a visitor gets — two orderings would eventually
 * disagree, and only one of them is visible from any given screen. Manual
 * arrangement survives in the one place it means something: the homepage
 * carousel's manual source, which stores its order in `pageSections.items[]`.
 */

/**
 * Newest first. Drafts have no publication date, so they sort after everything
 * published — not before it, which is where `null` would land them in a naive
 * compare.
 *
 * Exported because whoever pages the list has to apply it BEFORE slicing. The
 * API returns rows in natural order; sorting only the ten rows handed to this
 * component put newer videos on page two.
 */
export const byNewest = (a: AdminVideo, b: AdminVideo): number => {
  if (!a.publishedAt && !b.publishedAt) return 0;
  if (!a.publishedAt) return 1;
  if (!b.publishedAt) return -1;
  return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
};

export const VideoTable = ({
  videos,
  locale = "ar",
  thumbnails,
  rowMenu,
}: {
  videos: readonly AdminVideo[];
  locale?: "ar" | "en";
  /** `thumbnailId` to a servable URL. An absent id draws the placeholder
   *  rather than a guessed platform URL — a thumbnail nobody stored is not a
   *  thumbnail this screen may invent. */
  thumbnails?: ReadonlyMap<string, string>;
  /** The row's options, and only when given: a reader who may not write gets
   *  no options rather than a column full of refusals. */
  rowMenu?: (row: AdminVideo) => readonly RowMenuItem[];
}) => {
  const t = useTranslations("Videos");

  // Sorted here too, cheaply and idempotently: the order is this component's
  // own guarantee, not something it trusts a caller for.
  const rows = [...videos].sort(byNewest);

  const menuFor = (row: AdminVideo) =>
    rowMenu ? (
      <RowMenu label={t("rowMenuLabel", { title: titleOf(row.title, locale) })} items={rowMenu(row)} />
    ) : null;

  const columns: Column<AdminVideo>[] = [
    {
      key: "title",
      header: t("colThumbnail"),
      render: (row) => (
        // `min-w-0` on both levels so the text can actually shrink inside the
        // width the column was given. Without it the URL — one unbreakable
        // string — sets the stack's floor and the clipping never happens.
        <span className="flex min-w-0 items-center gap-3">
          <RowStill row={row} thumbnails={thumbnails} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <RowTitle row={row} locale={locale} />
            <RowUrl row={row} />
          </span>
        </span>
      ),
    },
    // Every column but the first has a natural size, so it is given one and
    // the title column absorbs whatever is left. Without the widths, fixed
    // layout would divide the table into seven equal parts.
    { key: "platform", header: t("colPlatform"), width: "8.5rem", render: (row) => <RowPlatform row={row} /> },
    { key: "kind", header: t("colKind"), width: "5.5rem", render: (row) => t(`kind_${row.kind}`) },
    { key: "category", header: t("colCategory"), width: "7.5rem", render: (row) => t(`category_${row.category}`) },
    { key: "status", header: t("colStatus"), width: "6.5rem", render: (row) => <RowStatus row={row} /> },
    { key: "date", header: t("colDate"), width: "8rem", ltr: true, render: (row) => <RowDate row={row} locale={locale} /> },
  ];

  if (rowMenu) {
    columns.push({ key: "actions", header: t("colActions"), width: "5rem", render: menuFor });
  }

  // One empty line for both layouts, rather than the table's empty row on one
  // side and the card list's on the other.
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] px-6 py-10 text-center text-body-sm text-[color:var(--color-text-muted)]">
        {t("empty")}
      </p>
    );
  }

  return (
    <>
      {/* Phone width. A list, announced as one: a screen reader should not be
          told about a table that is not being drawn. */}
      <ul aria-label={t("tableCaption")} className="flex flex-col gap-3 xl:hidden">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-raised)] p-3"
          >
            <div className="flex items-start gap-3">
              <RowStill row={row} thumbnails={thumbnails} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <RowTitle row={row} locale={locale} />
                <RowUrl row={row} />
              </div>
              {menuFor(row)}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-caption text-[color:var(--color-text-secondary)]">
              <RowPlatform row={row} />
              <RowStatus row={row} />
              <RowDate row={row} locale={locale} />
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden xl:block">
        {/* `empty` is unreachable — the early return above covers it for both
            layouts — but the prop is required, and the same words are the
            honest value for it. */}
        <DataTable
          caption={t("tableCaption")}
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          empty={t("empty")}
        />
      </div>
    </>
  );
};
