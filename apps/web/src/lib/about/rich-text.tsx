import { Fragment } from "react";

/**
 * The one piece of formatting an editor can put inside an About page
 * paragraph: `**text**` reads as emphasis.
 *
 * ── Why this exists rather than a rich-text editor ────────────────────────
 *
 * The story is two paragraphs with a few emphasised names and dates in them.
 * A second rich-text system beside the newsroom's would be a stored document
 * format, a sanitiser, a toolbar and a migration, for four bold runs. So the
 * field stays a plain bilingual string and this reads the one mark it may
 * carry.
 *
 * ── Why it never touches innerHTML ───────────────────────────────────────
 *
 * The string is written by whoever holds the About page's Update grant, and it
 * is printed to every visitor. Rendering it as HTML would make "may edit this
 * page" mean "may run script in this origin" — a much larger permission than
 * the one being granted. So the text is split into runs and React prints each
 * run as text: `<script>` typed into the field arrives at the browser as the
 * eight characters an editor typed, because at no point is it anything else.
 *
 * `**` is the whole vocabulary. An unclosed pair, an empty pair and a lone
 * asterisk are all literal — an editor halfway through typing should see what
 * they typed, not the rest of the paragraph turning bold.
 */

export interface TextRun {
  text: string;
  emphasis: boolean;
}

/** Matches a non-empty run between two double asterisks, without crossing a
 *  line or swallowing the asterisks of a neighbouring pair. */
const EMPHASIS = /\*\*([^*]+?)\*\*/g;

export const splitEmphasis = (text: string): TextRun[] => {
  const runs: TextRun[] = [];
  let cursor = 0;

  for (const match of text.matchAll(EMPHASIS)) {
    const start = match.index ?? 0;
    if (start > cursor) {
      runs.push({ text: text.slice(cursor, start), emphasis: false });
    }
    runs.push({ text: match[1], emphasis: true });
    cursor = start + match[0].length;
  }

  if (cursor < text.length) {
    runs.push({ text: text.slice(cursor), emphasis: false });
  }

  // An unclosed or empty pair produces no match at all, so the string comes
  // back as the single plain run it was — which is the intended behaviour, not
  // a fallback.
  return runs;
};

export const RichText = ({ text }: { text: string }) => (
  <>
    {splitEmphasis(text).map((run, index) => (
      <Fragment key={index}>
        {run.emphasis ? <strong className="font-semibold">{run.text}</strong> : run.text}
      </Fragment>
    ))}
  </>
);
