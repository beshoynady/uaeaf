"use client";

/**
 * How much of one field a search result will show.
 *
 * ── One language, one counter, under its own input ─────────────────────────
 *
 * This counts ONE language, so it can be placed under the input it counts.
 * The two copies it replaces each rendered BOTH languages inside a single
 * wrapping flex row, placed as a sibling of the whole `BilingualField` — so
 * the row sat below the closed two-column grid, and the flex row laid both
 * counters out from the inline-start edge. On the Arabic dashboard that edge
 * is the right, which is also where the Arabic input sits, so both counters
 * bunched under the Arabic column and the English input had none under it.
 *
 * Counting one language is what makes the placement possible: a counter that
 * knows about two fields cannot sit under one of them.
 *
 * ── Why the caller supplies the words ──────────────────────────────────────
 *
 * The two editors using this read from different message namespaces
 * (`EditorialEditor` and `PresidentMessage`) while sharing the key names. A
 * component that picked a namespace would belong to one of them; one that
 * takes the finished sentence belongs to neither.
 *
 * ── Why over-limit is not an error ─────────────────────────────────────────
 *
 * Nothing truncates on save. A longer description is stored whole and cut only
 * where it is displayed — by the search engine, which decides its own length
 * regardless. So exceeding the guidance is worth saying and is not a failure:
 * the sentence changes, the field does not, and the colour stays in the
 * secondary tier rather than borrowing the error role.
 */
export const CharCounter = ({
  text,
  over,
  lang,
}: {
  /** The finished, localised sentence — count and limit already in it. */
  text: string;
  /** Past the guidance. Emphasis only: nothing is blocked or trimmed. */
  over: boolean;
  lang: "ar" | "en";
}) => (
  <p
    lang={lang}
    dir={lang === "ar" ? "rtl" : "ltr"}
    className={`text-caption ${
      over
        ? "font-medium text-[color:var(--color-text-secondary)]"
        : "text-[color:var(--color-text-muted)]"
    }`}
  >
    {text}
  </p>
);
