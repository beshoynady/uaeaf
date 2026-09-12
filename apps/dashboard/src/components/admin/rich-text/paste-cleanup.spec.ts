import { describe, expect, it } from "vitest";
import { cleanPastedHtml } from "./paste-cleanup";

/**
 * What happens to a paste, and what the author is told about it.
 *
 * ProseMirror already drops whatever the schema cannot represent, so an
 * uncleaned paste is not *unsafe* — it is silent. An author who pastes four
 * paragraphs and three photographs from a press release gets four paragraphs
 * and no explanation, and finds out the photographs are gone when the page is
 * live. Everything here exists so that the removal is deliberate, bounded,
 * and reported with a number.
 */
const clean = (html: string, lang: "ar" | "en" = "ar") => cleanPastedHtml(html, lang);

describe("a paste with nothing wrong with it", () => {
  it("keeps the text and reports no removals", () => {
    const result = clean("<p>A sentence.</p><p>Another one.</p>");

    expect(result.html).toContain("A sentence.");
    expect(result.html).toContain("Another one.");
    expect(result.removed).toEqual({
      media: 0,
      table: 0,
      formatting: 0,
      italic: 0,
      heading: 0,
    });
  });

  it("leaves an allowed link where it is", () => {
    const result = clean('<p><a href="https://uaeaf.ae">UAEAF</a></p>');

    expect(result.html).toContain('href="https://uaeaf.ae"');
    expect(result.removed.formatting).toBe(0);
  });
});

describe("media", () => {
  it("removes an image and counts it", () => {
    const result = clean('<p>Before</p><img src="https://x.example/a.jpg"><p>After</p>');

    expect(result.html).not.toContain("img");
    expect(result.html).toContain("Before");
    expect(result.html).toContain("After");
    expect(result.removed.media).toBe(1);
  });

  it.each([
    ["<img src='a'><video src='b'></video><svg></svg>", 3],
    ["<iframe src='a'></iframe><object data='b'></object>", 2],
  ])("counts each removed element in %s", (html, expected) => {
    expect(clean(html).removed.media).toBe(expected);
  });

  /**
   * A `<figure>` is unwrapped rather than removed. Removing it whole would
   * take the caption with it, and a caption is text the author wrote — the
   * one thing this module must never delete without saying so.
   */
  it("keeps a figure's caption while removing the picture inside it", () => {
    const result = clean("<figure><img src='a'><figcaption>Who this is</figcaption></figure>");

    expect(result.html).toContain("Who this is");
    expect(result.html).not.toContain("img");
    expect(result.removed.media).toBe(1);
  });

  it("removes a script without letting its text become body text", () => {
    const result = clean("<p>Real</p><script>alert('not real')</script>");

    expect(result.html).not.toContain("alert");
    expect(result.html).toContain("Real");
  });

  // The stylesheet sits *after* a paragraph on purpose: a leading <style> is
  // hoisted into <head> by the HTML parser and never reaches the body, so a
  // test written that way would pass without the removal ever running.
  it("removes a stylesheet without letting its rules become body text", () => {
    const result = clean("<p>Real</p><style>p{color:red}</style>");

    expect(result.html).not.toContain("color:red");
    expect(result.html).toContain("Real");
  });
});

describe("tables", () => {
  /**
   * A table is removed whole rather than flattened. Flattening turns a
   * results grid into an unreadable run of paragraphs with no columns and no
   * headers — worse than nothing, and harder to notice.
   */
  it("removes a table and counts it once", () => {
    const result = clean(
      "<p>Lead</p><table><tr><td>1</td><td>2</td></tr><tr><td>3</td><td>4</td></tr></table>",
    );

    expect(result.html).not.toContain("<table");
    expect(result.html).toContain("Lead");
    expect(result.removed.table).toBe(1);
  });
});

describe("formatting", () => {
  it("strips style and class without losing the text", () => {
    const result = clean('<p style="color:red" class="lead">Kept</p>');

    expect(result.html).toContain("Kept");
    expect(result.html).not.toContain("color:red");
    expect(result.html).not.toContain("lead");
    expect(result.removed.formatting).toBe(1);
  });

  it("counts an element once however many attributes it carried", () => {
    const result = clean('<p style="color:red" class="a" id="b" dir="ltr" align="center">One</p>');

    expect(result.removed.formatting).toBe(1);
  });

  it("unwraps a span and keeps its text", () => {
    const result = clean('<p>Before <span style="font-weight:700">inside</span> after</p>');

    expect(result.html).not.toContain("span");
    expect(result.html).toContain("inside");
    expect(result.removed.formatting).toBe(1);
  });

  it("strips a link's title, which the API refuses, but keeps the link", () => {
    const result = clean('<p><a href="https://uaeaf.ae" title="hover">UAEAF</a></p>');

    expect(result.html).toContain('href="https://uaeaf.ae"');
    expect(result.html).not.toContain("hover");
    expect(result.removed.formatting).toBe(1);
  });

  it("removes a link whose scheme the API refuses, keeping the words", () => {
    const result = clean('<p><a href="tel:+97100000000">Call us</a></p>');

    expect(result.html).not.toContain("tel:");
    expect(result.html).toContain("Call us");
    expect(result.removed.formatting).toBe(1);
  });
});

describe("italic", () => {
  it("unwraps italic in Arabic and counts it separately from other formatting", () => {
    const result = clean("<p>نص <em>مائل</em> هنا</p>", "ar");

    expect(result.html).not.toContain("<em");
    expect(result.html).toContain("مائل");
    expect(result.removed.italic).toBe(1);
    expect(result.removed.formatting).toBe(0);
  });

  it("counts <i> the same as <em>", () => {
    const result = clean("<p><i>one</i> and <em>two</em></p>", "ar");

    expect(result.removed.italic).toBe(2);
  });

  it("leaves italic alone in English", () => {
    const result = clean("<p>text <em>slanted</em> here</p>", "en");

    expect(result.html).toContain("<em");
    expect(result.removed.italic).toBe(0);
  });
});

describe("headings", () => {
  /**
   * The allowed levels are 2 and 3 — the page's single H1 belongs to the
   * hero. A pasted H1 is clamped up to the shallowest allowed level and a
   * pasted H4 down to the deepest, rather than being dropped to body text:
   * the author marked those words as a heading, and losing that is a larger
   * change than moving them one level.
   */
  it("clamps h1 to the shallowest allowed level", () => {
    const result = clean("<h1>Title</h1>");

    expect(result.html).toContain("<h2>Title</h2>");
    expect(result.removed.heading).toBe(1);
  });

  it.each(["h4", "h5", "h6"])("clamps %s to the deepest allowed level", (tag) => {
    const result = clean(`<${tag}>Deep</${tag}>`);

    expect(result.html).toContain("<h3>Deep</h3>");
    expect(result.removed.heading).toBe(1);
  });

  it("leaves an allowed heading level untouched", () => {
    const result = clean("<h2>Fine</h2><h3>Also fine</h3>");

    expect(result.removed.heading).toBe(0);
  });
});

describe("the counts as a whole", () => {
  it("reports every kind from one messy paste", () => {
    const result = clean(
      [
        "<h1>Press release</h1>",
        '<p class="lead">The federation <em>today</em> announced.</p>',
        '<img src="https://x.example/a.jpg">',
        "<table><tr><td>1</td></tr></table>",
      ].join(""),
      "ar",
    );

    expect(result.removed).toEqual({
      media: 1,
      table: 1,
      formatting: 1,
      italic: 1,
      heading: 1,
    });
  });
});
