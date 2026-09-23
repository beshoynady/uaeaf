import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronIcon } from "@/components/ui/chevron-icon";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import { feedHref, pageWindow } from "@/lib/news/feed-query";
import type { FeedQuery } from "@/lib/news/feed-query";

/**
 * Moving through the listing (approved canvas `NewsListing.dc.html`).
 *
 * The listing has always fetched one page and drawn it; `NEWS_PAGE_SIZE`
 * recorded the pager as the real answer and backlog. This is it.
 *
 * ── Links, not buttons ─────────────────────────────────────────────────────
 *
 * Every page of the feed is an address, for the same reasons the time filter
 * is: a reader can bookmark page 3, send it, and walk back out with the
 * browser's own history. It also means the pager works before any JavaScript
 * arrives, which is the state the first paint is in. The canvas draws
 * `<button>`s; a button that navigates is a link wearing the wrong element,
 * and it takes the back button away.
 *
 * ── The ends, when there is no page beyond them ────────────────────────────
 *
 * The previous arrow on page 1 is not a disabled button — it is absent, and a
 * `span` holds its place so the numbers do not jump sideways between pages.
 * A disabled control that is focusable announces an action a reader cannot
 * take; one that is not focusable is a tab stop that appears and disappears
 * as they page.
 *
 * ── Recorded deviation from the canvas ─────────────────────────────────────
 *
 * The canvas draws these 40×40 at a 10px radius. 40px is under the 44px touch
 * floor that IA §12 states as a KPI for every small screen, and 10px is not a
 * step of the radius scale (8 · 12 · 16 · 24). They are drawn at 44px and
 * `radius.md`, which is the same shell the contact page's channel buttons use.
 */
/** One cell of the pager. 44px, not the canvas's 40px: IA §12 states the touch
 *  floor as a KPI for every small screen.
 *
 *  `FOCUS` is written at each call site rather than folded in here, because
 *  `interaction-state-contract.spec.ts` reads the `className` attribute and a
 *  ring buried in a local constant is one it cannot verify. A rule that cannot
 *  see the indicator is a rule that cannot protect it. */
const CELL = `inline-flex size-11 items-center justify-center rounded-[var(--radius-md)] text-body-sm ${TRANSITION}`;

/** A page the reader is not on. Hover and active move together, because hover
 *  alone is mouse-only feedback on a mobile-priority layer (PR-006). */
const QUIET =
  "border border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:border-[color:var(--color-action-default)] active:text-[color:var(--color-text-primary)]";

export const NewsPagination = ({ query, pages }: { query: FeedQuery; pages: number }) => {
  const t = useTranslations("News");

  // One page is not a thing to page through, and a pager over it is a control
  // that cannot do anything.
  if (pages <= 1) return null;

  const step = (direction: "back" | "forward", page: number, label: string) =>
    page >= 1 && page <= pages ? (
      <Link href={feedHref(query, { page })} aria-label={label} className={`${CELL} ${QUIET} ${FOCUS}`}>
        <ChevronIcon direction={direction} />
      </Link>
    ) : (
      // Holds the column so the numbers sit still from page to page.
      <span aria-hidden="true" className="size-11" />
    );

  return (
    <nav aria-label={t("paginationLabel")} className="flex items-center justify-center gap-2">
      {step("back", query.page - 1, t("previousPage"))}

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
                href={feedHref(query, { page })}
                // `aria-current` rather than colour alone, so the page a
                // reader is on reaches them whether or not they see the fill.
                aria-current={page === query.page ? "page" : undefined}
                aria-label={t("goToPage", { page })}
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

      {step("forward", query.page + 1, t("nextPage"))}
    </nav>
  );
};
