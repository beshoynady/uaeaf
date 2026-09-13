import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RichText, renderBlocks, type RichTextNode } from "./rich-text";

/**
 * The message body reaches the page as a ProseMirror document and leaves it as
 * elements, node by node. The API validates every write against its allowlist
 * (`api/src/common/rich-text/rich-text-allowlist.ts`); this renderer is the
 * second line: it draws only what that list allows and drops anything else,
 * so a document that somehow skipped validation still cannot put markup, a
 * script URL or an Arabic italic on the page.
 */

const doc = (...content: RichTextNode[]): RichTextNode => ({ type: "doc", content });
const text = (value: string, marks?: RichTextNode["marks"]): RichTextNode => ({
  type: "text",
  text: value,
  ...(marks ? { marks } : {}),
});
const paragraph = (...content: RichTextNode[]): RichTextNode => ({ type: "paragraph", content });

const draw = (node: RichTextNode, locale: "ar" | "en" = "ar") =>
  render(<RichText doc={node} locale={locale} />).container;

describe("RichText", () => {
  it("renders a paragraph with its bold lead-in, character for character", () => {
    const container = draw(
      doc(paragraph(text("يتبنّى", [{ type: "bold" }]), text(" اتحاد الإمارات لألعاب القوى"))),
    );

    const p = container.querySelector("p");
    expect(p?.textContent).toBe("يتبنّى اتحاد الإمارات لألعاب القوى");
    expect(p?.querySelector("strong")?.textContent).toBe("يتبنّى");
  });

  it("renders body headings one level below the page's h1, at the h3 and h4 sizes", () => {
    const container = draw(
      doc(
        { type: "heading", attrs: { level: 2 }, content: [text("قسم")] },
        { type: "heading", attrs: { level: 3 }, content: [text("فرع")] },
      ),
    );

    expect(container.querySelector("h2")?.className).toContain("text-h3");
    expect(container.querySelector("h3")?.className).toContain("text-h4");
  });

  it("never renders a heading level the allowlist refuses", () => {
    const container = draw(doc({ type: "heading", attrs: { level: 1 }, content: [text("عنوان")] }));
    expect(container.querySelector("h1")).toBeNull();
  });

  it("renders lists, quotations, rules and line breaks", () => {
    const container = draw(
      doc(
        { type: "bulletList", content: [{ type: "listItem", content: [paragraph(text("أ"))] }] },
        {
          type: "orderedList",
          attrs: { start: 3 },
          content: [{ type: "listItem", content: [paragraph(text("ب"))] }],
        },
        { type: "blockquote", content: [paragraph(text("ج"))] },
        { type: "horizontalRule" },
        paragraph(text("د"), { type: "hardBreak" }, text("هـ")),
      ),
    );

    expect(container.querySelector("ul > li")?.textContent).toBe("أ");
    expect(container.querySelector("ol")).toHaveAttribute("start", "3");
    expect(container.querySelector("blockquote")?.textContent).toBe("ج");
    expect(container.querySelector("hr")).not.toBeNull();
    expect(container.querySelector("p br")).not.toBeNull();
  });

  it("links only to the schemes the allowlist accepts, keeping the words of any other", () => {
    const container = draw(
      doc(
        paragraph(
          text("الموقع", [{ type: "link", attrs: { href: "https://uaeaf.ae", target: "_blank" } }]),
          text(" "),
          text("خطر", [{ type: "link", attrs: { href: "javascript:alert(1)" } }]),
        ),
      ),
    );

    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://uaeaf.ae");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(container.textContent).toContain("خطر");
  });

  it("keeps italic in English and never draws it in Arabic", () => {
    const node = doc(paragraph(text("athletics", [{ type: "italic" }])));

    expect(draw(node, "en").querySelector("em")?.textContent).toBe("athletics");

    const arabic = draw(node, "ar");
    expect(arabic.querySelector("em")).toBeNull();
    expect(arabic.textContent).toBe("athletics");
  });

  it("drops a node the allowlist does not name, and a mark it does not name", () => {
    const container = draw(
      doc(
        { type: "image", attrs: { src: "https://example.com/x.png" } },
        paragraph(text("نص", [{ type: "underline" }])),
      ),
    );

    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("u")).toBeNull();
    expect(container.textContent).toBe("نص");
  });

  it("returns the top-level blocks one by one, so a page can place content between them", () => {
    const blocks = renderBlocks(doc(paragraph(text("١")), paragraph(text("٢"))), "ar");
    expect(blocks).toHaveLength(2);
  });

  it("never injects HTML", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "rich-text.tsx"), "utf-8");
    expect(source).not.toMatch(/dangerouslySetInnerHTML/);
  });
});
