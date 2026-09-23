import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BADGE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";
import { ARTICLE_TOPICS } from "@/lib/api/types";
import { feedHref } from "@/lib/news/feed-query";
import type { FeedQuery } from "@/lib/news/feed-query";

/**
 * Narrowing the feed to one subject (ADR-0094, approved canvas
 * `NewsListing.dc.html`).
 *
 * Real filtering, not decoration: `GET /articles/public` gained a `topic`
 * parameter on 2026-09-22 and this writes it. The alternative the canvas would
 * otherwise have led to — chips drawn because the design has chips, doing
 * nothing — is a false affordance, and a reader who presses one and sees the
 * same list concludes the site is broken rather than that the feature is not
 * finished (Chapter 11 §UX).
 *
 * Links rather than a form, like the time filter beside it: every narrowing is
 * an address. Pressing a topic keeps the tag and the date window a reader has
 * already set, and returns to the first page — `feedHref` decides both, once,
 * for all three controls.
 *
 * ── Why the chips are not the `TopicBadge` ─────────────────────────────────
 *
 * A badge states what a story is about; these choose what the list shows. The
 * two look alike and behave differently, and a coloured chip that is also a
 * control would make every badge on every card look pressable. So the filter
 * wears the same shell the time presets wear — one pressed state, one quiet
 * state — and the colour stays with the badges that carry meaning.
 */
/** The same shell the time presets wear, so the two rows read as one control
 *  rather than two kinds of thing.
 *
 *  `FOCUS` is written at each call site rather than folded in here:
 *  `interaction-state-contract.spec.ts` reads the `className` attribute, and a
 *  ring buried in a local constant is one it cannot verify. */
const CHIP = `${BADGE} min-h-11 px-4 transition-colors duration-[var(--motion-duration-instant)]`;

/** Each state names its own border width beside its border colour. `BADGE`
 *  already sets one, but a colour that relies on a width from another string
 *  is a colour `surface-standard.spec.ts` cannot verify has anything to paint
 *  — and an unpainted border colour is a silent no-op. */
const CHIP_PRESSED =
  "border border-transparent bg-[color:var(--color-brand-primary)] text-[color:var(--color-text-on-brand)]";

const CHIP_QUIET =
  "border border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:border-[color:var(--color-action-default)] active:text-[color:var(--color-text-primary)]";

const chip = (pressed: boolean) => `${CHIP} ${pressed ? CHIP_PRESSED : CHIP_QUIET}`;

export const NewsTopicFilter = ({ query }: { query: FeedQuery }) => {
  const t = useTranslations("News");

  return (
    <nav aria-label={t("topicFilterLabel")}>
      {/* Wrapped, never clipped: seven labels do not fit one row at 390px,
          and a clipped row hides a filter a reader is looking for. */}
      <ul className="flex list-none flex-wrap gap-2 p-0">
        <li>
          {/* `aria-current` rather than colour alone, so the pressed state
              reaches a reader who cannot see which chip is filled. */}
          <Link
            href={feedHref(query, { topic: undefined })}
            aria-current={query.topic ? undefined : "page"}
            className={`${chip(!query.topic)} ${FOCUS}`}
          >
            {t("topicAll")}
          </Link>
        </li>
        {ARTICLE_TOPICS.map((topic) => (
          <li key={topic}>
            <Link
              href={feedHref(query, { topic })}
              aria-current={query.topic === topic ? "page" : undefined}
              className={`${chip(query.topic === topic)} ${FOCUS}`}
            >
              {t(`topic_${topic}`)}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
