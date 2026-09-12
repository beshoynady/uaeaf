import { describe, expect, it } from "vitest";
import { countTextBlocks, findParagraphMismatch } from "./paragraph-mismatch";

/**
 * The two halves of a bilingual message are written weeks apart, often by
 * different people. The defect this catches is a translator merging two
 * paragraphs into one, or dropping the last one — which nobody sees until the
 * published page shows five blocks in Arabic beside four in English.
 *
 * It is a warning, never a refusal: a message may legitimately be structured
 * differently in the two languages, and the author is the one who knows.
 */
const doc = (...content: unknown[]) => ({ type: "doc", content });
const p = (text?: string) => ({
  type: "paragraph",
  content: text === undefined ? undefined : [{ type: "text", text }],
});

describe("countTextBlocks", () => {
  it("counts one top-level block per paragraph that carries text", () => {
    expect(countTextBlocks(doc(p("One"), p("Two"), p("Three")))).toBe(3);
  });

  /** An empty paragraph is how an author makes vertical space, not content. */
  it("ignores an empty paragraph", () => {
    expect(countTextBlocks(doc(p("One"), p(), p("Two")))).toBe(2);
  });

  it("ignores a horizontal rule, which carries no text", () => {
    expect(countTextBlocks(doc(p("One"), { type: "horizontalRule" }, p("Two")))).toBe(2);
  });

  it("counts a heading", () => {
    expect(
      countTextBlocks(
        doc({ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "H" }] }, p("A")),
      ),
    ).toBe(2);
  });

  /**
   * A list is one block however long it is. Counting items would report a
   * mismatch every time a translator rendered three bullets as three
   * sentences, which is a translation decision and not a defect.
   */
  it("counts a list as one block whatever its length", () => {
    const list = (items: number) => ({
      type: "bulletList",
      content: Array.from({ length: items }, (_, index) => ({
        type: "listItem",
        content: [p(`Item ${index}`)],
      })),
    });

    expect(countTextBlocks(doc(list(2)))).toBe(1);
    expect(countTextBlocks(doc(list(7)))).toBe(1);
  });

  it("counts a blockquote as one block", () => {
    expect(countTextBlocks(doc({ type: "blockquote", content: [p("Q"), p("R")] }))).toBe(1);
  });

  it("treats whitespace as no text at all", () => {
    expect(countTextBlocks(doc(p("   "), p("Real")))).toBe(1);
  });

  it.each([null, undefined, {}, { type: "doc" }, "not a document", 7])(
    "treats %s as an empty document rather than throwing",
    (value) => {
      expect(countTextBlocks(value)).toBe(0);
    },
  );
});

describe("findParagraphMismatch", () => {
  it("reports nothing when both languages have the same number of blocks", () => {
    expect(findParagraphMismatch(doc(p("١"), p("٢")), doc(p("One"), p("Two")))).toBeNull();
  });

  it("reports both counts when they differ", () => {
    expect(findParagraphMismatch(doc(p("١"), p("٢"), p("٣")), doc(p("One"), p("Two")))).toEqual({
      ar: 3,
      en: 2,
    });
  });

  /**
   * An untranslated half is work in progress, not a structural difference.
   * Warning about it would put a permanent notice on every message from the
   * moment the first Arabic paragraph is typed until the English is finished.
   */
  it("reports nothing while one language is still empty", () => {
    expect(findParagraphMismatch(doc(p("١"), p("٢")), doc())).toBeNull();
    expect(findParagraphMismatch(doc(), doc(p("One")))).toBeNull();
  });

  it("reports nothing when both are empty", () => {
    expect(findParagraphMismatch(doc(), doc())).toBeNull();
  });
});
