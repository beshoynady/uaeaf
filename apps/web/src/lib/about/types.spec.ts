import { describe, expect, it } from "vitest";
import { ABOUT_SECTION_ORDER, sectionAnchor } from "./types";

describe("ABOUT_SECTION_ORDER", () => {
  it("is the printed order, hero first and the call to action last (ADR-0101 D3)", () => {
    expect(ABOUT_SECTION_ORDER).toEqual([
      "hero",
      "facts",
      "story",
      "timeline",
      "achievements",
      "pioneers",
      "leadership",
      "governance",
      "ecosystem",
      "cta",
    ]);
  });
});

describe("sectionAnchor", () => {
  it("gives every section a distinct anchor", () => {
    const anchors = ABOUT_SECTION_ORDER.map(sectionAnchor);

    expect(new Set(anchors).size).toBe(ABOUT_SECTION_ORDER.length);
  });
});
