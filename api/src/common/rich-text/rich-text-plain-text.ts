/**
 * Reading the text back out of a stored rich-text document.
 *
 * The stored form is a tree, so "what does this message actually say" is a
 * traversal rather than a regex over markup. Two consumers need it: the
 * content-import test, which compares the imported message against the
 * approved copy character for character, and any future search or excerpt.
 */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (node: unknown): string => {
  if (!isRecord(node)) {
    return '';
  }

  if (node.type === 'text') {
    return typeof node.text === 'string' ? node.text : '';
  }

  if (node.type === 'hardBreak') {
    return '\n';
  }

  return Array.isArray(node.content) ? node.content.map(textOf).join('') : '';
};

/**
 * One entry per top-level block that carries text, in document order.
 *
 * Blocks with no text — a horizontal rule — are skipped rather than
 * contributing an empty string, so the result indexes the same way the
 * reader counts paragraphs.
 */
export function richTextParagraphs(doc: unknown): string[] {
  if (!isRecord(doc) || doc.type !== 'doc' || !Array.isArray(doc.content)) {
    return [];
  }

  return doc.content.map(textOf).filter((text) => text.length > 0);
}

/** The whole document as plain text, blocks separated by a blank line. */
export function richTextPlainText(doc: unknown): string {
  return richTextParagraphs(doc).join('\n\n');
}
