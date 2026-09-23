import { describe, expect, it } from "vitest";
import { missingFieldCount, missingFieldIds } from "./article-required";

describe("missingFieldIds", () => {
  it("names nothing when the form is ready", () => {
    expect(missingFieldIds({})).toEqual([]);
    expect(missingFieldCount({})).toBe(0);
  });

  it("lists the fields in the order they appear on screen, not the order they were found", () => {
    // The validator fills its object in its own order. "First error" has to
    // mean "first on screen", or pressing save throws the author to the
    // bottom of the form to fix something that is above what they were shown.
    expect(missingFieldIds({ slug: "invalid", titleAr: true, topic: true })).toEqual([
      "article-title-ar",
      "article-topic",
      "article-slug",
    ]);
  });

  it("counts the two halves of a bilingual field separately", () => {
    // They are two inputs an author visits one at a time. Saying "1 left" and
    // then refusing the save again is worse than counting honestly.
    expect(missingFieldCount({ titleAr: true, titleEn: true })).toBe(2);
  });

  it("names both source fields when a round-up has neither", () => {
    expect(missingFieldIds({ sourceOutlet: true, sourceUrl: "missing" })).toEqual([
      "article-source-outlet",
      "article-source-url",
    ]);
  });

  it("treats a slug that is taken the same as one that is malformed", () => {
    // Both refuse the save, and both are fixed in the same input.
    expect(missingFieldIds({ slug: "taken" })).toEqual(["article-slug"]);
    expect(missingFieldIds({ slug: "invalid" })).toEqual(["article-slug"]);
  });
});
