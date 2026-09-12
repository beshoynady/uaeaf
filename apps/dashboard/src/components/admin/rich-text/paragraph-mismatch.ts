/**
 * Whether the two languages of one message are built the same way.
 *
 * The two halves are written weeks apart, often by different people. The
 * defect this catches is a translator merging two paragraphs into one, or
 * dropping the last one — which nobody sees until the published page shows
 * five blocks in Arabic beside four in English, and the two columns stop
 * lining up.
 *
 * It is a warning, never a refusal. A message may legitimately be structured
 * differently in the two languages; the author is the one who knows, and the
 * editor's job is to make sure they noticed.
 */

export interface ParagraphMismatch {
  ar: number;
  en: number;
}

interface RichTextNode {
  type?: unknown;
  text?: unknown;
  content?: unknown;
}

const isNode = (value: unknown): value is RichTextNode =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Whether this subtree contains a character an author actually typed. */
function hasText(node: unknown): boolean {
  if (!isNode(node)) {
    return false;
  }
  if (typeof node.text === "string" && node.text.trim() !== "") {
    return true;
  }
  return Array.isArray(node.content) && node.content.some(hasText);
}

/**
 * How many top-level blocks carry text.
 *
 * Top-level, so a list counts once however many items it has and a blockquote
 * counts once however many paragraphs are inside it. Counting deeper would
 * report a mismatch every time a translator rendered three bullets as three
 * sentences, which is a translation decision rather than a defect.
 *
 * Blocks with no text — an empty paragraph used as spacing, a horizontal rule
 * — are not counted, because they are not something to translate.
 *
 * Anything that is not a document is zero rather than an error: this runs on
 * every keystroke against a value that may not have loaded yet.
 */
export function countTextBlocks(doc: unknown): number {
  if (!isNode(doc) || doc.type !== "doc" || !Array.isArray(doc.content)) {
    return 0;
  }
  return doc.content.filter(hasText).length;
}

/**
 * The two counts when they differ, and `null` when they do not.
 *
 * A language that is still empty never reports a mismatch: an untranslated
 * half is work in progress, and warning about it would put a permanent notice
 * on the message from the first Arabic paragraph until the English is done.
 */
export function findParagraphMismatch(ar: unknown, en: unknown): ParagraphMismatch | null {
  const counts = { ar: countTextBlocks(ar), en: countTextBlocks(en) };

  if (counts.ar === 0 || counts.en === 0 || counts.ar === counts.en) {
    return null;
  }

  return counts;
}
