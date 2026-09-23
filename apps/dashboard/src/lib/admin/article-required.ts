import type { ArticleFieldErrors } from "./article-editor";

/**
 * Every field the save would be refused for, as the input ids they belong to,
 * in the order they appear in the form.
 *
 * ── Why an ordered list and not a count ────────────────────────────────────
 *
 * The bar needs two things from the same answer: how many are left, to say so,
 * and which one comes first, to send the author there. Deriving both from one
 * ordered list means the number and the destination can never disagree — a
 * count computed separately from the jump target is a bar that says "3 left"
 * and jumps to a field that is fine.
 *
 * ── Why the order is written out ───────────────────────────────────────────
 *
 * `ArticleFieldErrors` is an object, and object key order is the order the
 * validator happened to assign in. "First error" must mean "first on screen",
 * or the author is thrown to the bottom of the form to fix something above
 * whatever they were shown. So the order lives here, beside the form's own,
 * and a field that moves in the form moves here too.
 */
const FIELD_ORDER: readonly (readonly [keyof ArticleFieldErrors, string])[] = [
  ["titleAr", "article-title-ar"],
  ["titleEn", "article-title-en"],
  ["authorAr", "article-author-ar"],
  ["authorEn", "article-author-en"],
  ["topic", "article-topic"],
  ["sourceOutlet", "article-source-outlet"],
  ["sourceUrl", "article-source-url"],
  ["slug", "article-slug"],
];

/** The input ids the save is waiting on, first on screen first. */
export const missingFieldIds = (errors: ArticleFieldErrors): string[] =>
  FIELD_ORDER.filter(([key]) => Boolean(errors[key])).map(([, id]) => id);

/**
 * How many separate things the author still has to do.
 *
 * The two halves of one bilingual field count as two, because they are two
 * inputs an author visits separately — saying "1 left" and then refusing the
 * save again after they fill it would be worse than counting honestly.
 */
export const missingFieldCount = (errors: ArticleFieldErrors): number => missingFieldIds(errors).length;
