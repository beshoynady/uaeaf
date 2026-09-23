import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BADGE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";
import { TIME_RANGE_PRESETS, activePreset, presetRange } from "@uaeaf/content/time-range";
import { feedHref } from "@/lib/news/feed-query";
import type { FeedQuery } from "@/lib/news/feed-query";
import type { TimeRange } from "@uaeaf/content/time-range";

/**
 * Narrowing the feed to a stretch of time (`@uaeaf/content/time-range`).
 *
 * ── Why links and not a form ───────────────────────────────────────────────
 *
 * Every window is a page of this listing, so every window is an address. A
 * reader can bookmark "this month", send it to a colleague, and use the
 * browser's own back button to undo a filter — none of which a form that posts
 * to itself gives them. It also means the whole control works before any
 * JavaScript arrives, which is the state the first paint is in.
 *
 * ── Why the custom range is a `form` and the presets are not ───────────────
 *
 * A preset is one destination and needs no input. A custom range is two dates
 * a reader types, and the browser's own date control validates, formats and
 * localises them for free. `method="get"` keeps the result an address like the
 * presets, so the two halves of this control behave the same way afterwards.
 *
 * ── Why the boundaries are not computed here ───────────────────────────────
 *
 * They are the newsroom's too. An editor narrowing their own list to "this
 * month" and a visitor narrowing this feed to "this month" must be looking at
 * the same days, or the editor cannot tell what the public sees.
 */
export const NewsTimeFilter = ({ query }: { query: FeedQuery }) => {
  const t = useTranslations("News");
  const { range, tag, topic } = query;
  const active = activePreset(range);
  const filtered = Boolean(range.from || range.to);

  // Every other filter survives a change of window and the other way round: a
  // reader who followed a label, chose a topic and then narrowed the dates has
  // asked for all three. `feedHref` is where that rule lives for this control,
  // the topic chips and the pager alike.
  const href = (next: TimeRange) => feedHref(query, { range: next });

  const chip = (pressed: boolean) =>
    `${BADGE} min-h-11 px-4 transition-colors duration-[var(--motion-duration-instant)] ${FOCUS} ${
      pressed
        ? "border-transparent bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]"
        : "border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:border-[color:var(--color-action-default)] active:text-[color:var(--color-text-primary)]"
    }`;

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label={t("timeFilterLabel")}>
        {/* Wrapped, never clipped: four labels plus "all" do not fit one row at
            390px, and a clipped row hides a filter a reader is looking for. */}
        <ul className="flex list-none flex-wrap gap-2 p-0">
          <li>
            {/* `aria-current` rather than colour alone, so the pressed state
                reaches a reader who cannot see which chip is filled. */}
            <Link href={href({})} aria-current={filtered ? undefined : "page"} className={chip(!filtered)}>
              {t("timeAll")}
            </Link>
          </li>
          {TIME_RANGE_PRESETS.map((preset) => (
            <li key={preset}>
              <Link
                href={href(presetRange(preset))}
                aria-current={active === preset ? "page" : undefined}
                className={chip(active === preset)}
              >
                {t(`time_${preset}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* The custom range posts to this same listing. The filters already set
          ride along as hidden fields, because a GET form submits ONLY its own
          controls — without these, typing two dates would silently drop the
          tag and the topic the reader chose a moment earlier. */}
      <form method="get" action="/news" className="flex flex-wrap items-end gap-3">
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
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
    </div>
  );
};
