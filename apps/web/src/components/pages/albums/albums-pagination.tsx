import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronIcon } from "@/components/ui/chevron-icon";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { albumsHref } from "@/lib/albums/album-query";
import type { AlbumQuery } from "@/lib/albums/album-query";
import { pageWindow } from "@/lib/news/feed-query";

/**
 * The archive's pager (desktop; the phone gets "show more" instead).
 *
 * The same pager the news listing draws — links not buttons, the absent end
 * holding its column, 44px cells at `radius.md` — built on `albumsHref` so
 * every page keeps the reader's filters. It is a second copy of that markup
 * because `NewsPagination` is bound to the news query; lifting both onto one
 * href-builder is recorded as a follow-up rather than done from here, since
 * the news component is not this page's to change.
 */

const PATH = "/media/albums";

const CELL = `inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] text-body-sm ${TRANSITION}`;

const QUIET =
  "border border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:border-[color:var(--color-action-default)] active:text-[color:var(--color-text-primary)]";

export const AlbumsPagination = ({
  query,
  pages,
  className,
}: {
  query: AlbumQuery;
  pages: number;
  className?: string;
}) => {
  const t = useTranslations("albums.page.pagination");

  // One page is not a thing to page through.
  if (pages <= 1) return null;

  const at = (page: number) => albumsHref(PATH, { ...query, page });

  const step = (direction: "back" | "forward", page: number, label: string) =>
    page >= 1 && page <= pages ? (
      <Link
        href={at(page)}
        aria-label={label}
        className={`${CELL} ${QUIET} ${FOCUS}`}
      >
        <ChevronIcon direction={direction} />
      </Link>
    ) : (
      // Holds the column so the numbers sit still from page to page.
      <span aria-hidden="true" className="size-11" />
    );

  return (
    <nav
      aria-label={t("label")}
      className={`flex items-center justify-center gap-2 ${className ?? ""}`}
    >
      {step("back", query.page - 1, t("previous"))}

      <ul className="flex list-none items-center gap-2 p-0">
        {pageWindow(query.page, pages).map((page, index) =>
          page === "gap" ? (
            <li
              key={`gap-${index}`}
              aria-hidden="true"
              className="px-1 text-body-sm text-[color:var(--color-text-secondary)]"
            >
              …
            </li>
          ) : (
            <li key={page}>
              <Link
                href={at(page)}
                aria-current={page === query.page ? "page" : undefined}
                aria-label={t("goTo", { page })}
                className={`${CELL} ${FOCUS} ${
                  page === query.page
                    ? "border border-transparent bg-[color:var(--color-brand-primary)] font-bold text-[color:var(--color-text-on-brand)]"
                    : QUIET
                }`}
              >
                {page}
              </Link>
            </li>
          ),
        )}
      </ul>

      {step("forward", query.page + 1, t("next"))}
    </nav>
  );
};
