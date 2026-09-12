/**
 * The per-language allowlist for stored rich text (ADR-0069 D1).
 *
 * `messageBody` and every future rich-text field are stored as a
 * ProseMirror/TipTap document — a tree, not an HTML string — so what a
 * document may contain is a structural predicate this file states once and
 * `validate-rich-text.ts` enforces on every write, including one that
 * bypasses the dashboard.
 *
 * This list, not the editor's extension set, is the contract. The editor may
 * be reconfigured or replaced; a document that satisfies this file stays
 * valid, and a document that does not is refused no matter which client
 * produced it.
 */

export const RICH_TEXT_LANGS = ['ar', 'en'] as const;
export type RichTextLang = (typeof RICH_TEXT_LANGS)[number];

/** Nesting cap. `doc` is depth 1, its children depth 2, and so on. */
export const RICH_TEXT_MAX_DEPTH = 6;

/** Extracted-text cap per language. */
export const RICH_TEXT_MAX_LENGTH = 20_000;

/** Link schemes a stored document may point at. */
export const RICH_TEXT_LINK_SCHEMES = ['https:', 'http:', 'mailto:'] as const;

/** Headings start at 2 — the page's single H1 belongs to the hero. */
export const RICH_TEXT_HEADING_LEVELS = [2, 3] as const;

export const RICH_TEXT_NODES = [
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'blockquote',
  'horizontalRule',
  'hardBreak',
] as const;
export type RichTextNodeType = (typeof RICH_TEXT_NODES)[number];

export const RICH_TEXT_MARKS = ['bold', 'link', 'italic'] as const;
export type RichTextMarkType = (typeof RICH_TEXT_MARKS)[number];

/**
 * Marks refused in a given language.
 *
 * Chapter 4 §4.6: italic MUST NOT be used in Arabic — synthetic obliquing
 * breaks the letter joins Arabic is read by. English keeps it.
 */
export const RICH_TEXT_MARKS_REFUSED_BY_LANG: Readonly<Record<RichTextLang, readonly string[]>> = {
  ar: ['italic'],
  en: [],
};

/**
 * Attribute keys each node or mark may carry.
 *
 * An attribute whose value is `null` or `undefined` counts as absent, which
 * is exactly how ProseMirror represents "not set" — so an editor's default
 * attribute bag passes without the allowlist being widened for it. A key
 * that is absent from this map is refused whenever it carries a value, and
 * that is what refuses `textAlign`, and with it justify and every manual
 * alignment.
 */
export const RICH_TEXT_NODE_ATTRS: Readonly<Record<string, readonly string[]>> = {
  heading: ['level'],
  orderedList: ['start', 'type'],
};

export const RICH_TEXT_MARK_ATTRS: Readonly<Record<string, readonly string[]>> = {
  link: ['href', 'target', 'rel', 'class'],
};

/** `target` values a stored link may carry; `null` means "not set". */
export const RICH_TEXT_LINK_TARGETS = ['_blank'] as const;

/** `rel` values a stored link may carry; `null` means "not set". */
export const RICH_TEXT_LINK_RELS = ['noopener', 'noreferrer', 'noopener noreferrer'] as const;
