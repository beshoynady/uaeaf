import { isAllowedLinkHref } from "./allowlist";
import type { RichTextLang } from "./allowlist";

/**
 * What a paste loses, and how much of it.
 *
 * ProseMirror already refuses whatever the schema cannot represent, so an
 * uncleaned paste is not unsafe — it is *silent*. An author who pastes four
 * paragraphs and three photographs from a press release gets four paragraphs
 * and no explanation, and discovers the photographs are missing when the page
 * is already live.
 *
 * So this module does the removing itself, deliberately and in one place, and
 * returns a count of each kind so the editor can say what happened. The kinds
 * are a closed list because they are translated: an open-ended list of
 * removed tag names would be untranslatable and would tell an author nothing
 * they can act on.
 */

export const PASTE_REMOVAL_KINDS = ["media", "table", "formatting", "italic", "heading"] as const;
export type PasteRemovalKind = (typeof PASTE_REMOVAL_KINDS)[number];
export type PasteRemovals = Record<PasteRemovalKind, number>;

export interface PasteReport {
  html: string;
  removed: PasteRemovals;
}

/** Carries no authorial content — clipboard wrapper, not something pasted. */
const DROP_SILENTLY = new Set([
  "script",
  "style",
  "noscript",
  "link",
  "meta",
  "base",
  "form",
  "input",
  "button",
  "select",
  "option",
  "textarea",
  "template",
]);

/** Content the author put there that this platform cannot store. Counted. */
const MEDIA = new Set([
  "img",
  "picture",
  "source",
  "svg",
  "canvas",
  "video",
  "audio",
  "iframe",
  "embed",
  "object",
]);

/** Formatting the author applied that the contract refuses. Counted. */
const UNWRAP_COUNTED = new Set([
  "span",
  "font",
  "u",
  "s",
  "strike",
  "del",
  "ins",
  "mark",
  "sub",
  "sup",
  "small",
  "big",
  "center",
  "code",
  "pre",
  "tt",
  "kbd",
  "samp",
  "var",
  "abbr",
  "q",
  "cite",
  "dfn",
]);

/**
 * A pasted heading outside the allowed range is moved into it rather than
 * flattened. The author marked those words as a heading; losing that is a
 * larger change than moving them one level, and a document that arrives as an
 * unbroken run of paragraphs is the harder one to repair.
 */
const CLAMP_HEADING: Record<string, string> = { h1: "h2", h4: "h3", h5: "h3", h6: "h3" };

/** Attributes a surviving element may keep. Everything else is stripped. */
const KEEP_ATTRS: Record<string, readonly string[]> = { a: ["href"], ol: ["start"] };

const ITALIC = new Set(["em", "i"]);

function keptTags(lang: RichTextLang): Set<string> {
  const kept = new Set(["p", "br", "hr", "strong", "b", "a", "ul", "ol", "li", "blockquote", "h2", "h3"]);
  if (lang !== "ar") {
    for (const tag of ITALIC) {
      kept.add(tag);
    }
  }
  return kept;
}

function unwrap(element: Element): void {
  const parent = element.parentNode;
  if (!parent) {
    return;
  }
  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }
  element.remove();
}

/**
 * Strips every attribute the contract does not allow on this tag.
 *
 * Returns whether anything was taken, so the caller counts the *element*
 * once. Counting attributes instead would report "42 pieces of formatting
 * removed" for a single pasted paragraph from a word processor, which is
 * alarming and says nothing.
 */
function stripAttributes(element: Element, tag: string): boolean {
  const allowed = KEEP_ATTRS[tag] ?? [];
  let stripped = false;

  for (const name of Array.from(element.getAttributeNames())) {
    if (!allowed.includes(name)) {
      element.removeAttribute(name);
      stripped = true;
      continue;
    }
    // `start` is allowlisted but the API still refuses a value that is not a
    // counting number, so an unusable one is dropped rather than forwarded.
    if (tag === "ol" && name === "start") {
      const start = Number(element.getAttribute("start"));
      if (!Number.isInteger(start) || start < 1) {
        element.removeAttribute("start");
        stripped = true;
      }
    }
  }

  return stripped;
}

/**
 * Cleans one pasted fragment and reports what it removed.
 *
 * Runs before ProseMirror parses the HTML, so what reaches the document is
 * already inside the contract — see `allowlist.spec.ts`, which round-trips
 * the result through the API's own validator.
 */
export function cleanPastedHtml(html: string, lang: RichTextLang): PasteReport {
  const removed: PasteRemovals = { media: 0, table: 0, formatting: 0, italic: 0, heading: 0 };
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const keep = keptTags(lang);
  const refusesItalic = lang === "ar";

  const walk = (parent: ParentNode): void => {
    for (const node of Array.from(parent.childNodes)) {
      if (node.nodeType === 8 /* comment */) {
        node.parentNode?.removeChild(node);
        continue;
      }
      if (node.nodeType !== 1 /* element */) {
        continue;
      }

      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      if (DROP_SILENTLY.has(tag)) {
        element.remove();
        continue;
      }

      if (MEDIA.has(tag)) {
        element.remove();
        removed.media += 1;
        continue;
      }

      // Removed whole, not flattened: flattening turns a results grid into an
      // unreadable run of paragraphs with no columns and no headers — worse
      // than nothing, and harder for the author to notice.
      if (tag === "table") {
        element.remove();
        removed.table += 1;
        continue;
      }

      if (refusesItalic && ITALIC.has(tag)) {
        walk(element);
        unwrap(element);
        removed.italic += 1;
        continue;
      }

      const clamped = CLAMP_HEADING[tag];
      if (clamped) {
        const replacement = parsed.createElement(clamped);
        while (element.firstChild) {
          replacement.appendChild(element.firstChild);
        }
        element.replaceWith(replacement);
        removed.heading += 1;
        walk(replacement);
        continue;
      }

      if (UNWRAP_COUNTED.has(tag)) {
        walk(element);
        unwrap(element);
        removed.formatting += 1;
        continue;
      }

      // A link the platform cannot store loses its destination but keeps its
      // words — deleting the sentence because its link was unusable would be
      // a far larger edit than the author asked for.
      if (tag === "a" && !isAllowedLinkHref(element.getAttribute("href") ?? "")) {
        walk(element);
        unwrap(element);
        removed.formatting += 1;
        continue;
      }

      // Anything unrecognised is structure rather than formatting — the
      // wrappers a word processor puts around everything. Unwrapped without a
      // count, because reporting them would drown the counts that matter.
      if (!keep.has(tag)) {
        walk(element);
        unwrap(element);
        continue;
      }

      if (stripAttributes(element, tag)) {
        removed.formatting += 1;
      }
      walk(element);
    }
  };

  walk(parsed.body);

  return { html: parsed.body.innerHTML, removed };
}

export function pasteRemovalTotal(removed: PasteRemovals): number {
  return PASTE_REMOVAL_KINDS.reduce((total, kind) => total + removed[kind], 0);
}
