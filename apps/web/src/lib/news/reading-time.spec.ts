import { describe, expect, it } from "vitest";
import { readingMinutes, WORDS_PER_MINUTE } from "./reading-time";

const doc = (...paragraphs: string[]) => ({
  type: "doc",
  content: paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
});

const words = (count: number, word = "كلمة") => Array.from({ length: count }, () => word).join(" ");

/**
 * The reading time on the lead story (owner decision 2026-09-22): counted from
 * the story's own words, rounded up, never less than a minute.
 */
describe("readingMinutes", () => {
  it("reads at the owner's rate of 200 words a minute", () => {
    expect(WORDS_PER_MINUTE).toBe(200);
    expect(readingMinutes(doc(words(200)))).toBe(1);
    expect(readingMinutes(doc(words(400)))).toBe(2);
  });

  it("rounds a part-minute up", () => {
    expect(readingMinutes(doc(words(201)))).toBe(2);
    expect(readingMinutes(doc(words(450)))).toBe(3);
  });

  it("never says less than a minute, even for a story with no text yet", () => {
    expect(readingMinutes(doc("خبر"))).toBe(1);
    expect(readingMinutes(null)).toBe(1);
    expect(readingMinutes({ type: "doc" })).toBe(1);
  });

  it("counts every paragraph, heading and list item, not only the first", () => {
    const nested = {
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: words(100) }] },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: words(150) }] }] }],
        },
        { type: "paragraph", content: [{ type: "text", text: words(100) }] },
      ],
    };

    expect(readingMinutes(nested)).toBe(2);
  });

  it("does not count the spaces around a word as words", () => {
    expect(readingMinutes(doc(`  ${words(199)}   \n  `, "   "))).toBe(1);
    expect(readingMinutes(doc(words(201, "word")))).toBe(2);
  });
});
