import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { isAllowedLinkHref, richTextExtensions } from "./allowlist";
import type { RichTextLang } from "./allowlist";

/**
 * Parity between what this editor can produce and what the API will store.
 *
 * The API's allowlist is the contract (ADR-0069 D1) and it is enforced on
 * every write, including one that never came from this dashboard. So this
 * file does not restate the contract — it **imports the API's own source
 * files** and asserts the editor satisfies them. A rule added, removed or
 * tightened upstream fails here without anyone having to remember that a
 * second copy exists.
 *
 * The failure this guards against is silent: an extension whose stored
 * attribute defaults differ from the allowlist produces documents the editor
 * renders happily and the API refuses on save, and the author is told only
 * that "rich text is not allowed" — naming neither the field nor the reason.
 */
const API_RICH_TEXT = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
  "..",
  "..",
  "api",
  "src",
  "common",
  "rich-text",
);

// A moved or renamed API file must fail loudly here. Importing a path that
// does not exist would otherwise surface as an opaque resolver error, and a
// test that cannot find its contract is not a passing test.
for (const file of ["rich-text-allowlist.ts", "validate-rich-text.ts"]) {
  if (!existsSync(join(API_RICH_TEXT, file))) {
    throw new Error(`The API's ${file} is not under ${API_RICH_TEXT}. Update this test's path.`);
  }
}

const { validateRichText } = (await import(
  /* @vite-ignore */ pathToFileURL(join(API_RICH_TEXT, "validate-rich-text.ts")).href
)) as { validateRichText: (doc: unknown, lang: RichTextLang) => { path: string; rule: string }[] };

const api = (await import(
  /* @vite-ignore */ pathToFileURL(join(API_RICH_TEXT, "rich-text-allowlist.ts")).href
)) as {
  RICH_TEXT_NODES: readonly string[];
  RICH_TEXT_MARKS: readonly string[];
  RICH_TEXT_MARKS_REFUSED_BY_LANG: Record<RichTextLang, readonly string[]>;
  RICH_TEXT_NODE_ATTRS: Record<string, readonly string[]>;
  RICH_TEXT_MARK_ATTRS: Record<string, readonly string[]>;
  RICH_TEXT_HEADING_LEVELS: readonly number[];
  RICH_TEXT_LINK_TARGETS: readonly string[];
  RICH_TEXT_LINK_RELS: readonly string[];
  RICH_TEXT_LINK_SCHEMES: readonly string[];
};

type AttrMap = Record<string, Record<string, { default?: unknown }>>;

/**
 * What the editor actually registered — read back from a live instance, not
 * from the array this module returns.
 *
 * The difference matters: `StarterKit` is one extension that expands into
 * twenty, so the returned array says nothing about which of them are on.
 * Reading the resolved list is what makes "italic is not registered" a
 * statement about the editor rather than about a literal.
 */
function inspect(lang: RichTextLang) {
  const editor = new Editor({ extensions: richTextExtensions(lang) });
  try {
    const attrsOf = (types: Record<string, { spec: { attrs?: unknown } }>): AttrMap =>
      Object.fromEntries(
        Object.entries(types).map(([name, type]) => [
          name,
          (type.spec.attrs ?? {}) as AttrMap[string],
        ]),
      );
    const registered = editor.extensionManager.extensions;
    return {
      nodes: attrsOf(editor.schema.nodes),
      marks: attrsOf(editor.schema.marks),
      registered: registered.map((extension) => extension.name),
      headingLevels: registered.find((extension) => extension.name === "heading")?.options.levels,
    };
  } finally {
    editor.destroy();
  }
}

const EDITOR: Record<RichTextLang, ReturnType<typeof inspect>> = {
  ar: inspect("ar"),
  en: inspect("en"),
};

const LANGS = ["ar", "en"] as const;

describe("the editor's schema against the API's allowlist", () => {
  it.each(LANGS)("registers no node the API refuses (%s)", (lang) => {
    const names = Object.keys(EDITOR[lang].nodes);
    expect(names.filter((name) => !api.RICH_TEXT_NODES.includes(name))).toEqual([]);
  });

  it.each(LANGS)("registers no mark the API refuses (%s)", (lang) => {
    const names = Object.keys(EDITOR[lang].marks);
    expect(names.filter((name) => !api.RICH_TEXT_MARKS.includes(name))).toEqual([]);
    expect(
      names.filter((name) => api.RICH_TEXT_MARKS_REFUSED_BY_LANG[lang].includes(name)),
    ).toEqual([]);
  });

  it.each(LANGS)(
    "declares no attribute the API refuses, unless it defaults to absent (%s)",
    (lang) => {
      const offenders: string[] = [];

      const check = (kind: "node" | "mark", types: AttrMap) => {
        const allowedBy = kind === "node" ? api.RICH_TEXT_NODE_ATTRS : api.RICH_TEXT_MARK_ATTRS;
        for (const [name, attrs] of Object.entries(types)) {
          const allowed = allowedBy[name] ?? [];
          for (const [attr, spec] of Object.entries(attrs)) {
            // The API counts `null`/`undefined` as "not set", so an attribute
            // the editor never populates is invisible to it.
            const absentByDefault = spec.default === null || spec.default === undefined;
            if (!allowed.includes(attr) && !absentByDefault) {
              offenders.push(`${kind} ${name}.${attr} = ${JSON.stringify(spec.default)}`);
            }
          }
        }
      };

      check("node", EDITOR[lang].nodes);
      check("mark", EDITOR[lang].marks);

      expect(offenders).toEqual([]);
    },
  );

  it.each(LANGS)("offers exactly the heading levels the API allows (%s)", (lang) => {
    expect(EDITOR[lang].headingLevels).toEqual([...api.RICH_TEXT_HEADING_LEVELS]);
  });

  it.each(LANGS)("creates links the API will accept (%s)", (lang) => {
    const attrs = EDITOR[lang].marks.link;
    expect(api.RICH_TEXT_LINK_TARGETS).toContain(attrs.target?.default);
    expect(api.RICH_TEXT_LINK_RELS).toContain(attrs.rel?.default);
    // `class` is allowlisted as a key but refused whenever it carries a
    // value, so the only passing default is none.
    expect(attrs.class?.default ?? null).toBeNull();
  });
});

/**
 * Everything the toolbar can put into a document, written as the HTML a
 * browser hands ProseMirror. Parsing it exercises each extension's real
 * `parseHTML` and its real attribute defaults, which is where parity
 * actually breaks — a schema comparison cannot see an attribute the parser
 * populates or a default an extension inherits from its options.
 */
const EVERYTHING = [
  "<h2>A heading</h2>",
  "<h3>A smaller heading</h3>",
  "<p>Plain text with <strong>bold</strong> and ",
  '<a href="https://uaeaf.ae">a link</a>.</p>',
  "<ul><li><p>First</p></li><li><p>Second</p></li></ul>",
  "<ol><li><p>One</p></li></ol>",
  "<blockquote><p>Quoted</p></blockquote>",
  "<hr>",
  "<p>Before<br>after</p>",
].join("");

function parse(lang: RichTextLang, html: string): unknown {
  const editor = new Editor({ extensions: richTextExtensions(lang), content: html });
  try {
    return editor.getJSON();
  } finally {
    editor.destroy();
  }
}

describe("a document the editor itself produced", () => {
  it.each(LANGS)("passes the API's own validator with no violations (%s)", (lang) => {
    expect(validateRichText(parse(lang, EVERYTHING), lang)).toEqual([]);
  });

  it("keeps italic out of the Arabic document even when the content carries it", () => {
    const doc = parse("ar", "<p>نص <em>مائل</em> هنا</p>");
    expect(validateRichText(doc, "ar")).toEqual([]);
    expect(JSON.stringify(doc)).not.toContain("italic");
  });

  /**
   * TipTap's own default accepts ten schemes — `tel:`, `ftp:`, `sms:` and
   * more. The API accepts three. Left alone, the editor would make a `tel:`
   * link the save then refuses.
   */
  it.each(LANGS)("drops a link whose scheme the API refuses (%s)", (lang) => {
    const doc = parse(lang, '<p><a href="tel:+97100000000">call</a></p>');
    expect(validateRichText(doc, lang)).toEqual([]);
    expect(JSON.stringify(doc)).not.toContain("tel:");
  });
});

describe("the Arabic editor", () => {
  /**
   * Chapter 4 §4.6: synthetic obliquing breaks the letter joins Arabic is
   * read by. Hiding the button would leave Mod-I, the `*text*` input rule and
   * the paste parser all still producing the mark, so the extension is not
   * registered at all.
   */
  it("does not register italic at all, so no keyboard shortcut reaches it", () => {
    expect(EDITOR.ar.registered).not.toContain("italic");
    expect(Object.keys(EDITOR.ar.marks)).not.toContain("italic");
  });

  it("still registers italic for English, which is where the rule does not apply", () => {
    expect(EDITOR.en.registered).toContain("italic");
    expect(Object.keys(EDITOR.en.marks)).toContain("italic");
  });
});

describe("alignment", () => {
  /**
   * The API refuses `textAlign` by omission — it is simply not in
   * `RICH_TEXT_NODE_ATTRS`. This asserts the editor never produces it, in
   * either language, so justify and every manual alignment are unreachable
   * rather than merely unbuttoned.
   */
  it.each(LANGS)("is not an attribute any node carries (%s)", (lang) => {
    for (const attrs of Object.values(EDITOR[lang].nodes)) {
      expect(Object.keys(attrs)).not.toContain("textAlign");
    }
  });
});

describe("isAllowedLinkHref", () => {
  it.each(["https://uaeaf.ae/x", "http://uaeaf.ae/x", "mailto:info@uaeaf.ae"])(
    "accepts %s, which the API accepts",
    (href) => {
      expect(api.RICH_TEXT_LINK_SCHEMES).toContain(`${href.split(":")[0]}:`);
      expect(isAllowedLinkHref(href)).toBe(true);
    },
  );

  it.each(["tel:+97100000000", "ftp://uaeaf.ae/x", "sms:123", "xmpp:a@b", "javascript:alert(1)"])(
    "refuses %s, which the API refuses",
    (href) => {
      expect(api.RICH_TEXT_LINK_SCHEMES).not.toContain(`${href.split(":")[0]}:`);
      expect(isAllowedLinkHref(href)).toBe(false);
    },
  );

  it("refuses a relative href, which the public renderer cannot resolve", () => {
    expect(isAllowedLinkHref("/about")).toBe(false);
  });
});
