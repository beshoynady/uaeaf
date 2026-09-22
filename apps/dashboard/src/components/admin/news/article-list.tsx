"use client";

import { useId, useMemo, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BUTTON_PRIMARY } from "@/components/ui/interactive";
import { SearchField } from "@/components/ui/search-field";
import { SelectField } from "@/components/ui/select-field";
import { NewsTimeFilter } from "./time-filter";
import { rangeIsPossible } from "@uaeaf/content/time-range";
import type { TimeRange } from "@uaeaf/content/time-range";
import {
  ARTICLE_CATEGORIES,
  newsroomStateOf,
  topicMessageKey,
  type Article,
  type ArticleCategory,
  type NewsroomState,
  type ReviewSummary,
} from "@/lib/admin/articles";

/**
 * Every article the newsroom has, in every state.
 *
 * ── Where the state comes from ─────────────────────────────────────────────
 *
 * The stored state has two values by decision; everything between draft and
 * published is a fact about the review. `newsroomStateOf` derives the label
 * from both, in one place, so this list and the editor cannot disagree about
 * what a row is — and so "changes requested" is distinguishable from
 * "rejected", which the engine itself cannot tell apart.
 *
 * ── Why the filtering is local ─────────────────────────────────────────────
 *
 * The API filters by state and category too, and the listing route uses it for
 * paging. These controls narrow what is already on screen: a newsroom's page
 * of rows is small, and a round trip per keystroke would make the search feel
 * broken on the connection this is most likely used over.
 */
const ALL = "__all__";

const STATES: NewsroomState[] = [
  "draft",
  "inReview",
  "changesRequested",
  "rejected",
  "approved",
  "published",
  "hidden",
];

export const ArticleList = ({
  articles,
  reviews,
  locale,
  canCreate,
}: {
  articles: readonly Article[];
  /** The latest review per article id, for the derived state. */
  reviews: ReadonlyMap<string, ReviewSummary>;
  locale: "ar" | "en";
  /** Whether this reader holds `articles:Create`. The route checks the same
   *  grant; drawing the link without it would offer a screen that refuses. */
  canCreate: boolean;
}) => {
  const t = useTranslations("Newsroom");
  const format = useFormatter();
  const fieldId = useId();

  const [search, setSearch] = useState("");
  const [state, setState] = useState<NewsroomState | typeof ALL>(ALL);
  const [category, setCategory] = useState<ArticleCategory | typeof ALL>(ALL);
  const [range, setRange] = useState<TimeRange>({});

  const rows = useMemo(
    () =>
      articles.map((article) => ({ article, state: newsroomStateOf(article, reviews.get(article._id)) })),
    [articles, reviews],
  );

  /**
   * Whether a row's publication date falls inside the window.
   *
   * An unpublished draft has no publication date, so a window excludes it —
   * which is the honest answer: "published this week" cannot include something
   * that has not been published. `to` runs to the end of its day, as it does
   * upstream, or a filter ending today would drop everything published today.
   *
   * A window that closes before it opens narrows nothing rather than emptying
   * the list, so an editor mid-correction still sees their rows.
   */
  const inRange = (published: string | null | undefined) => {
    if (!range.from && !range.to) return true;
    if (!rangeIsPossible(range.from, range.to)) return true;
    if (!published) return false;

    const at = new Date(published).getTime();
    if (range.from && at < new Date(`${range.from}T00:00:00.000Z`).getTime()) return false;
    if (range.to && at > new Date(`${range.to}T23:59:59.999Z`).getTime()) return false;
    return true;
  };

  const visible = rows.filter(
    (row) =>
      (state === ALL || row.state === state) &&
      (category === ALL || row.article.category === category) &&
      inRange(row.article.publishDate) &&
      (search.trim() === "" ||
        row.article.title.ar.includes(search.trim()) ||
        row.article.title.en.toLowerCase().includes(search.trim().toLowerCase())),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-4">
        <SearchField
          label={t("search")}
          value={search}
          onValueChange={setSearch}
          className="min-w-60 flex-1"
        />

        <SelectField
          id={`${fieldId}-state`}
          label={t("filterState")}
          value={state}
          onChange={(event) => setState(event.target.value as NewsroomState | typeof ALL)}
          options={[
            { value: ALL, label: t("all") },
            ...STATES.map((value) => ({ value, label: t(`state_${value}`) })),
          ]}
        />

        <SelectField
          id={`${fieldId}-category`}
          label={t("filterCategory")}
          value={category}
          onChange={(event) => setCategory(event.target.value as ArticleCategory | typeof ALL)}
          options={[
            { value: ALL, label: t("all") },
            ...ARTICLE_CATEGORIES.map((value) => ({ value, label: t(`category_${value}`) })),
          ]}
        />

        {canCreate ? (
          // A link, not a button: starting an article is a navigation, and a
          // button would lose the middle-click, the new tab and the address
          // an editor copies to a colleague.
          //
          // `BUTTON_PRIMARY` rather than a hand-written approximation of it,
          // so this carries the same rest, hover, pressed and focus states as
          // every other primary action and cannot drift from them.
          <Link href="/news/new" className={BUTTON_PRIMARY}>
            {t("newArticle")}
          </Link>
        ) : null}
      </div>

      <NewsTimeFilter range={range} onChange={setRange} />

      {visible.length === 0 ? (
        // Two different absences, two different sentences: an empty newsroom
        // and a filter that matched nothing need different next actions.
        <p className="text-body text-[color:var(--color-text-secondary)]">
          {articles.length === 0 ? t("empty") : t("emptyFiltered")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-body-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border-strong)]">
                <th scope="col" className="p-3 text-start font-medium">{t("columnTitle")}</th>
                <th scope="col" className="p-3 text-start font-medium">{t("columnState")}</th>
                <th scope="col" className="p-3 text-start font-medium">{t("columnCategory")}</th>
                <th scope="col" className="p-3 text-start font-medium">{t("columnTopic")}</th>
                <th scope="col" className="p-3 text-start font-medium">{t("columnUpdated")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map(({ article, state: rowState }) => (
                <tr key={article._id} className="border-b border-[color:var(--color-border-default)]">
                  <td className="p-3">
                    <Link
                      href={`/news/${article._id}`}
                      className="rounded-xs underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--a11y-focus-ring)]"
                    >
                      {article.title[locale]}
                    </Link>
                  </td>
                  <td className="p-3">{t(`state_${rowState}`)}</td>
                  <td className="p-3">{t(`category_${article.category}`)}</td>
                  <td className="p-3">
                    {article.topic ? (
                      t(topicMessageKey(article.topic))
                    ) : (
                      // Dashed and secondary: a gap to fill, not an error. The
                      // article stays publishable (owner decision 2026-09-22).
                      <span className="inline-flex items-center rounded-full border border-dashed border-[color:var(--color-border-strong)] px-2.5 py-0.5 text-[color:var(--color-text-secondary)]">
                        {t("topicMissing")}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-[color:var(--color-text-secondary)]">
                    {article.updatedAt
                      ? format.dateTime(new Date(article.updatedAt), { dateStyle: "medium" })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
