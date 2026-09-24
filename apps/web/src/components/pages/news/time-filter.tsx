"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { BADGE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";
import { TIME_RANGE_PRESETS, activePreset, presetRange } from "@uaeaf/content/time-range";
import { feedHref } from "@/lib/news/feed-query";
import type { FeedQuery } from "@/lib/news/feed-query";
import type { TimeRange, TimeRangePreset } from "@uaeaf/content/time-range";

/**
 * Narrowing the feed to a stretch of time (`@uaeaf/content/time-range`).
 *
 * One list, not a row of chips (owner decision 2026-09-23). Five windows plus
 * a custom one took five chips and a permanently open pair of date fields —
 * three rows of controls above a listing whose first card then started below
 * the fold.
 *
 * ── The address is still the state ─────────────────────────────────────────
 *
 * Every window is a page of this listing, so every window is an address, and
 * the address shape did NOT change with the control: `from` and `to`, exactly
 * as the chips wrote them. No `period` parameter was added — a preset resolves
 * to its two dates before it reaches the URL, so a bookmark, a shared link and
 * the pager all keep working, and `activePreset` reads the current window back
 * out of the address to open the list on it.
 *
 * ── Why the chips are still here, inside `<noscript>` ──────────────────────
 *
 * A `select` that navigates needs JavaScript; the chips it replaced were links
 * and needed none, which is the state the first paint is in and the state a
 * reader with a blocked script stays in. So the chips remain as the fallback,
 * unchanged. Nothing a reader could reach before is out of reach now — that is
 * what `time-filter.spec.tsx` holds.
 *
 * ── Why the custom range is still a `form` ─────────────────────────────────
 *
 * A preset is one destination and needs no input. A custom range is two dates
 * a reader types, and the browser's own date control validates, formats and
 * localises them for free. `method="get"` keeps the result an address like the
 * presets, so both halves behave the same way afterwards — and it is why the
 * custom half needs no script either.
 *
 * ── Why the boundaries are not computed here ───────────────────────────────
 *
 * They are the newsroom's too. An editor narrowing their own list to "this
 * month" and a visitor narrowing this feed to "this month" must be looking at
 * the same days, or the editor cannot tell what the public sees.
 */

/** `all` and `custom` are not presets — one is the absence of a window and the
 *  other is a window only the reader can name — so the list's values are the
 *  presets with those two around them. */
const ALL = "all";
const CUSTOM = "custom";
type Choice = typeof ALL | typeof CUSTOM | TimeRangePreset;

const chip = (pressed: boolean) =>
  `${BADGE} min-h-11 px-4 transition-colors duration-[var(--motion-duration-instant)] ${FOCUS} ${
    pressed
      ? "border border-transparent bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]"
      : "border border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:border-[color:var(--color-action-default)] active:text-[color:var(--color-text-primary)]"
  }`;

/** What the address currently says, as one of the list's own values. A window
 *  that matches no preset is the reader's own, so the list says `custom`
 *  rather than falling back to `all` while the feed is plainly narrowed. */
const choiceOf = (range: TimeRange): Choice => {
  if (!range.from && !range.to) return ALL;
  return activePreset(range) ?? CUSTOM;
};

export const NewsTimeFilter = ({ query }: { query: FeedQuery }) => {
  const t = useTranslations("News");
  const router = useRouter();
  const { range, tag, category, topic } = query;

  const current = choiceOf(range);
  const [choice, setChoice] = useState<Choice>(current);
  // The address is the truth. A reader who presses back lands on a different
  // window with the same component mounted, and the list has to follow it
  // rather than keep the value it was left on.
  const [seen, setSeen] = useState<Choice>(current);
  if (seen !== current) {
    setSeen(current);
    setChoice(current);
  }

  // Every other filter survives a change of window and the other way round: a
  // reader who followed a label, chose a shelf and a topic and then narrowed
  // the dates has asked for all four. `feedHref` is where that rule lives for
  // this control, the tabs, the topic chips and the pager alike.
  const href = (next: TimeRange) => feedHref(query, { range: next });

  const choose = (value: Choice) => {
    setChoice(value);
    // `custom` names no window on its own — it reveals the two fields and
    // waits for them, so the feed stays where it is until they are submitted.
    if (value === CUSTOM) return;
    router.push(value === ALL ? href({}) : href(presetRange(value)));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-caption text-[color:var(--color-text-secondary)]">
          {t("timeFilterLabel")}
          <select
            value={choice}
            onChange={(event) => choose(event.target.value as Choice)}
            className={`min-h-11 rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] px-3 text-body-sm text-[color:var(--color-text-primary)] ${FOCUS}`}
          >
            <option value={ALL}>{t("timeAll")}</option>
            {TIME_RANGE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {t(`time_${preset}`)}
              </option>
            ))}
            <option value={CUSTOM}>{t("timeCustom")}</option>
          </select>
        </label>
      </div>

      {/* The custom range posts to this same listing. The filters already set
          ride along as hidden fields, because a GET form submits ONLY its own
          controls — without these, typing two dates would silently drop the
          shelf, the tag and the topic the reader chose a moment earlier. */}
      {choice === CUSTOM ? (
        <form method="get" action="/news" className="flex flex-wrap items-end gap-3">
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {topic ? <input type="hidden" name="topic" value={topic} /> : null}

          {(["from", "to"] as const).map((bound) => (
            <label key={bound} className="flex flex-col gap-1 text-caption text-[color:var(--color-text-secondary)]">
              {t(`time_${bound}`)}
              <input
                type="date"
                name={bound}
                defaultValue={range[bound] ?? ""}
                className={`min-h-11 rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] px-3 text-body-sm text-[color:var(--color-text-primary)] ${FOCUS}`}
              />
            </label>
          ))}

          <button type="submit" className={chip(false)}>
            {t("timeApply")}
          </button>
        </form>
      ) : null}

      {/* Without JavaScript the list above cannot navigate. These are the
          links it replaced, unchanged, so every window stays reachable. The
          custom form above is a GET form and needs no script, but it is inside
          the `custom` branch that only the list can open — so it is repeated
          here, always open, for the same reader. */}
      <noscript>
        <nav aria-label={t("timeFilterLabel")}>
          <ul className="flex list-none flex-wrap gap-2 p-0">
            <li>
              <Link href={href({})} aria-current={current === ALL ? "page" : undefined} className={chip(current === ALL)}>
                {t("timeAll")}
              </Link>
            </li>
            {TIME_RANGE_PRESETS.map((preset) => (
              <li key={preset}>
                <Link
                  href={href(presetRange(preset))}
                  aria-current={current === preset ? "page" : undefined}
                  className={chip(current === preset)}
                >
                  {t(`time_${preset}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form method="get" action="/news" className="mt-3 flex flex-wrap items-end gap-3">
          {tag ? <input type="hidden" name="tag" value={tag} /> : null}
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {topic ? <input type="hidden" name="topic" value={topic} /> : null}

          {(["from", "to"] as const).map((bound) => (
            <label key={bound} className="flex flex-col gap-1 text-caption text-[color:var(--color-text-secondary)]">
              {t(`time_${bound}`)}
              <input
                type="date"
                name={bound}
                defaultValue={range[bound] ?? ""}
                className={`min-h-11 rounded-[var(--radius-sm)] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-raised)] px-3 text-body-sm text-[color:var(--color-text-primary)] ${FOCUS}`}
              />
            </label>
          ))}

          <button type="submit" className={chip(false)}>
            {t("timeApply")}
          </button>
        </form>
      </noscript>
    </div>
  );
};
