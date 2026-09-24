import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FOCUS } from "@/components/ui/interactive";
import { ARTICLE_CATEGORIES } from "@/lib/api/types";
import { feedHref } from "@/lib/news/feed-query";
import type { ArticleCategory } from "@/lib/api/types";
import type { FeedQuery } from "@/lib/news/feed-query";

/**
 * Which shelf of the newsroom the listing shows: everything, the federation's
 * own reporting, or the round-ups of what other outlets published first.
 *
 * ── Why this is a row of links and not `CMP-TABS-001` ──────────────────────
 *
 * The component in Chapter 8 L3 is an ARIA tab widget — `role="tablist"`, a
 * roving tabindex, panels swapped inside one page. That is the right shape
 * when the alternatives live in one document. These do not: every view of this
 * listing is an address, which is the rule the time filter, the topic chips
 * and the pager are all built on, and the shelves ride in the same query
 * string as the rest. WAI-ARIA's practice for navigation between addresses is
 * a `nav` of links marked with `aria-current`, not `role="tab"` — a tablist
 * whose "tabs" navigate away lies to a screen reader about what pressing one
 * does. So this wears the tab row's *look* and the topic filter's *semantics*.
 *
 * Recorded as a deviation from CMP-TABS-001 rather than an oversight, and it
 * is the same call `topic-filter.tsx` already made beneath it.
 *
 * ── Why the shelf is a separate row from the topics ────────────────────────
 *
 * They are different questions. `category` is who wrote the story; `topic` is
 * what it is about (ADR-0094). A story carries exactly one of each, and a
 * reader may narrow by both at once — so putting the media shelf in among the
 * topic chips would read as a seventh topic and imply choosing it replaces
 * whatever topic was chosen. `feedHref` keeps both axes through every change.
 */

/** The tab's shell. Wider padding and a bottom edge rather than the chips'
 *  pill, so the two rows are visibly a hierarchy — the shelf first, then the
 *  subject within it — rather than two rows of the same kind of control. */
const TAB = `inline-flex min-h-11 items-center px-4 text-body-sm font-bold transition-colors duration-[var(--motion-duration-instant)]`;

/**
 * Each state names its own border width beside its colour, and names them on
 * the SAME edge.
 *
 * `border-b-2` with a plain `border-[color:…]` would set the width on one edge
 * and the colour on four, painting three of them onto nothing — the defect
 * `surface-standard.spec.ts` exists to catch, and it caught this one. The
 * underline is a bottom edge, so both halves say `-b`.
 */
const TAB_OPEN =
  "border-b-2 border-b-[color:var(--color-brand-primary)] text-[color:var(--color-text-primary)]";

const TAB_QUIET =
  "border-b-2 border-b-transparent text-[color:var(--color-text-secondary)] hover:border-b-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:border-b-[color:var(--color-action-default)] active:text-[color:var(--color-text-primary)]";

const tab = (open: boolean) => `${TAB} ${open ? TAB_OPEN : TAB_QUIET}`;

/** The message key for each shelf. `inMediaHeading` already names the media
 *  shelf everywhere else on the site, so the tab does not invent a second
 *  wording for one thing. */
const LABEL: Record<ArticleCategory, string> = {
  General: "categoryGeneral",
  FederationInMedia: "inMediaHeading",
};

export const NewsCategoryTabs = ({ query }: { query: FeedQuery }) => {
  const t = useTranslations("News");

  return (
    <nav aria-label={t("categoryFilterLabel")}>
      {/* Wrapped, never clipped: three labels fit one row at 390px in English
          and are close to it in Arabic, and a clipped row hides a shelf a
          reader is looking for. */}
      <ul className="flex list-none flex-wrap gap-1 border-b border-[color:var(--color-border-default)] p-0">
        <li>
          {/* `aria-current` rather than the underline alone, so the open shelf
              reaches a reader who cannot see which tab is marked. */}
          <Link
            href={feedHref(query, { category: undefined })}
            aria-current={query.category ? undefined : "page"}
            className={`${tab(!query.category)} ${FOCUS}`}
          >
            {t("categoryAll")}
          </Link>
        </li>
        {ARTICLE_CATEGORIES.map((category) => (
          <li key={category}>
            <Link
              href={feedHref(query, { category })}
              aria-current={query.category === category ? "page" : undefined}
              className={`${tab(query.category === category)} ${FOCUS}`}
            >
              {t(LABEL[category])}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
