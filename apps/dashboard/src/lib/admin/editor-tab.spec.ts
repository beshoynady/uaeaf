import { describe, expect, it } from "vitest";
import { availableTabs, readEditorTab } from "./editor-tab";

const ALL = ["content", "seo", "review", "history"] as const;

describe("readEditorTab", () => {
  it("opens the tab named in the URL", () => {
    expect(readEditorTab("history", ALL)).toBe("history");
  });

  it("falls back to content for a name that is not a tab", () => {
    // A stale bookmark must open the editor, not an empty frame.
    expect(readEditorTab("versions", ALL)).toBe("content");
  });

  it("falls back to content for a tab this page does not offer", () => {
    // `?tab=seo` on a page with no SEO fields.
    expect(readEditorTab("seo", ["content", "review"])).toBe("content");
  });

  it("falls back to content for an absent value", () => {
    expect(readEditorTab(null, ALL)).toBe("content");
    expect(readEditorTab(undefined, ALL)).toBe("content");
  });

  it("takes the first of a repeated parameter", () => {
    // `?tab=seo&tab=review` — the first is what the link carried.
    expect(readEditorTab(["seo", "review"], ALL)).toBe("seo");
  });
});

describe("availableTabs", () => {
  it("always offers content", () => {
    expect(availableTabs({ review: false, history: false, seo: false })).toEqual(["content"]);
  });

  it("keeps the tablist's order whatever order the flags arrive in", () => {
    // The order is the decision's, not the caller's: content, SEO, review,
    // history (owner decision 2026-09-26).
    expect(availableTabs({ history: true, review: true, seo: true })).toEqual([
      "content",
      "seo",
      "review",
      "history",
    ]);
  });

  it("omits a tab whose content the page did not supply", () => {
    expect(availableTabs({ review: true, history: false, seo: true })).toEqual([
      "content",
      "seo",
      "review",
    ]);
  });
});
