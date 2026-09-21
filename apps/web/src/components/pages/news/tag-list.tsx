import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BADGE } from "@/components/ui/surface";
import { FOCUS } from "@/components/ui/interactive";

/**
 * An article's free labels, each one a way into the list filtered by it.
 *
 * ── Why links and not text ─────────────────────────────────────────────────
 *
 * A tag that cannot be followed is decoration. The whole reason the newsroom
 * types them is that a reader who finds one story about a discipline can then
 * find the rest, so every chip is the filter it names.
 *
 * ── Why the label is the tag verbatim ──────────────────────────────────────
 *
 * The API stores what the newsroom typed and matches case-insensitively, so
 * the chip's text, the value in the address, and what a colleague pastes into
 * a message are all one string. Title-casing it here would make the badge and
 * the URL disagree about what the tag is called.
 *
 * ── Why a list and not a row of spans ──────────────────────────────────────
 *
 * `ul`/`li` so a screen reader says how many labels there are before reading
 * them, and so "tagged" names the group rather than each chip repeating it.
 */
export const TagList = ({
  tags,
  className = "",
}: {
  tags: readonly string[];
  className?: string;
}) => {
  const t = useTranslations("News");

  if (tags.length === 0) {
    // No empty label row, for the same reason there is no empty shelf.
    return null;
  }

  return (
    <nav aria-label={t("tagsLabel")} className={className}>
      <ul className="flex list-none flex-wrap gap-2 p-0">
        {tags.map((tag) => (
          <li key={tag}>
            <Link
              href={`/news?tag=${encodeURIComponent(tag)}`}
              // `relative` so the chip sits above a card's whole-card overlay
              // link: inside a card, an unpositioned chip is covered by the
              // headline's `after:absolute inset-0` and cannot be clicked.
              className={`${BADGE} relative border-[color:var(--color-border-strong)] text-[color:var(--color-text-secondary)] transition-colors duration-[var(--motion-duration-instant)] hover:border-[color:var(--color-action-default)] active:border-[color:var(--color-action-default)] hover:text-[color:var(--color-text-primary)] active:text-[color:var(--color-text-primary)] ${FOCUS}`}
            >
              {tag}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};
