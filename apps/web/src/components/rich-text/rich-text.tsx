import type { ReactNode } from "react";
import { FOCUS, TRANSITION } from "@/components/ui/interactive";
import type { AppLocale } from "@/i18n/routing";

/**
 * Stored rich text, drawn as elements (ADR-0069 D1).
 *
 * The API validates every write against its allowlist
 * (`api/src/common/rich-text/rich-text-allowlist.ts`). This renderer repeats
 * the part of that list that decides what reaches a reader, and fails closed:
 * a node or mark it does not name is not drawn, a link whose scheme it does not
 * accept keeps its words and loses its target, and nothing is ever injected as
 * HTML. A document that skipped validation still cannot put markup, a script
 * URL or an Arabic italic on the page.
 *
 * Spacing between blocks and the reading measure belong to the page that
 * places the text, not to the text.
 */

export interface RichTextMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface RichTextNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: RichTextMark[];
  content?: RichTextNode[];
}

/** `RICH_TEXT_MAX_DEPTH`: `doc` is depth 1. */
const MAX_DEPTH = 6;

/** `RICH_TEXT_LINK_SCHEMES`. */
const LINK_SCHEMES = ["https:", "http:", "mailto:"];

/** `RICH_TEXT_MARKS_REFUSED_BY_LANG`. Chapter 4 §4.6: synthetic obliquing
 *  breaks the joins Arabic is read by. */
const MARKS_REFUSED: Record<AppLocale, readonly string[]> = { ar: ["italic"], en: [] };

/** ADR-0063's link colour, underlined at rest so a link inside running text
 *  does not depend on colour alone (WCAG 1.4.1). */
const LINK = `rounded-xs text-[color:var(--color-text-link)] underline underline-offset-4 ${TRANSITION} ${FOCUS}`;

const safeHref = (href: unknown): string | null => {
  if (typeof href !== "string") return null;
  try {
    return LINK_SCHEMES.includes(new URL(href).protocol) ? href : null;
  } catch {
    // A relative or malformed address: the allowlist requires a scheme.
    return null;
  }
};

const withMark = (child: ReactNode, mark: RichTextMark, locale: AppLocale): ReactNode => {
  if (MARKS_REFUSED[locale].includes(mark.type)) return child;
  switch (mark.type) {
    case "bold":
      return <strong className="font-bold text-[color:var(--color-text-primary)]">{child}</strong>;
    case "italic":
      return <em>{child}</em>;
    case "link": {
      const href = safeHref(mark.attrs?.href);
      if (!href) return child;
      return mark.attrs?.target === "_blank" ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={LINK}>
          {child}
        </a>
      ) : (
        <a href={href} className={LINK}>
          {child}
        </a>
      );
    }
    default:
      return child;
  }
};

/** Italic innermost, then bold, the link outermost, so the whole run is one
 *  link target whichever order the editor stored the marks in. */
const MARK_ORDER = ["italic", "bold", "link"];

const renderInline = (node: RichTextNode, key: number, locale: AppLocale): ReactNode => {
  if (node.type === "hardBreak") return <br key={key} />;
  if (node.type !== "text" || !node.text) return null;
  const marks = [...(node.marks ?? [])].sort(
    (a, b) => MARK_ORDER.indexOf(a.type) - MARK_ORDER.indexOf(b.type),
  );
  return <span key={key}>{marks.reduce<ReactNode>((child, mark) => withMark(child, mark, locale), node.text)}</span>;
};

const inlineChildren = (node: RichTextNode, locale: AppLocale): ReactNode[] =>
  (node.content ?? []).map((child, index) => renderInline(child, index, locale));

const renderNode = (node: RichTextNode, key: number, locale: AppLocale, depth: number): ReactNode => {
  if (depth > MAX_DEPTH) return null;
  const blocks = () =>
    (node.content ?? []).map((child, index) => renderNode(child, index, locale, depth + 1));

  switch (node.type) {
    case "paragraph":
      return <p key={key}>{inlineChildren(node, locale)}</p>;
    case "heading": {
      // The page's one h1 is the hero's, so a body heading starts at h2 and
      // takes the next size down (`RICH_TEXT_HEADING_LEVELS`).
      if (node.attrs?.level === 2) {
        return (
          <h2 key={key} className="text-h3 text-balance text-[color:var(--color-text-primary)]">
            {inlineChildren(node, locale)}
          </h2>
        );
      }
      if (node.attrs?.level === 3) {
        return (
          <h3 key={key} className="text-h4 text-balance text-[color:var(--color-text-primary)]">
            {inlineChildren(node, locale)}
          </h3>
        );
      }
      return null;
    }
    case "bulletList":
      return (
        <ul key={key} className="list-disc ps-6">
          {blocks()}
        </ul>
      );
    case "orderedList": {
      const start = typeof node.attrs?.start === "number" ? node.attrs.start : undefined;
      return (
        <ol key={key} start={start} className="list-decimal ps-6">
          {blocks()}
        </ol>
      );
    }
    case "listItem":
      return <li key={key}>{blocks()}</li>;
    case "blockquote":
      return (
        <blockquote key={key} className="border-s-2 border-[color:var(--color-border-strong)] ps-4">
          {blocks()}
        </blockquote>
      );
    case "horizontalRule":
      return <hr key={key} className="border-[color:var(--color-border-default)]" />;
    default:
      return null;
  }
};

/** The document's top-level blocks, each already keyed, so a page can place
 *  something between them without re-walking the tree. */
export const renderBlocks = (doc: RichTextNode, locale: AppLocale): ReactNode[] =>
  doc.type === "doc"
    ? (doc.content ?? []).map((node, index) => renderNode(node, index, locale, 2)).filter((node) => node !== null)
    : [];

export const RichText = ({ doc, locale }: { doc: RichTextNode; locale: AppLocale }) => (
  <>{renderBlocks(doc, locale)}</>
);
