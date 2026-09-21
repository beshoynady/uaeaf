import { describe, expect, it } from "vitest";
import {
  newsroomStateOf,
  suggestSlug,
  validateArticleDraft,
  hasErrors,
  type Article,
} from "./articles";

const article = (overrides: Partial<Article> = {}): Article => ({
  _id: "1",
  title: { ar: "عنوان", en: "Headline" },
  slug: "headline",
  category: "General",
  coverMediaId: null,
  body: { ar: {}, en: {} },
  authorDisplayName: { ar: "الإعلام", en: "Media" },
  publishDate: null,
  publicationState: "Draft",
  archived: false,
  ...overrides,
});

/**
 * Six labels from two stored fields and one review.
 *
 * The stored state has only two values by decision, so everything between
 * draft and published is a fact about the review rather than about the
 * article. Deriving it in one function is what keeps the list and the editor
 * from disagreeing about what a row is.
 */
describe("newsroomStateOf", () => {
  it("calls a live article published, whatever review ran last", () => {
    expect(newsroomStateOf(article({ publicationState: "Live" }), { workflowStatus: "Approved" })).toBe(
      "published",
    );
  });

  it("calls a live article that is hidden exactly that", () => {
    // More specific than "published", and the distinction is the one an editor
    // opening the list needs: the article is out there, it is just not in the
    // feed.
    expect(newsroomStateOf(article({ publicationState: "Live", archived: true }))).toBe("hidden");
  });

  it("reads the review for everything between draft and published", () => {
    expect(newsroomStateOf(article(), { workflowStatus: "InProgress" })).toBe("inReview");
    expect(newsroomStateOf(article(), { workflowStatus: "Approved" })).toBe("approved");
    expect(newsroomStateOf(article(), { workflowStatus: "Returned" })).toBe("changesRequested");
  });

  it("tells a refusal apart from a request for changes", () => {
    // The engine treats them identically; the flag is the only thing that says
    // which the reviewer meant, and the two need different words on a list.
    expect(newsroomStateOf(article(), { workflowStatus: "Rejected" })).toBe("rejected");
    expect(newsroomStateOf(article(), { workflowStatus: "Rejected", revisionRequested: true })).toBe(
      "changesRequested",
    );
  });

  it("calls an article nobody has reviewed a draft", () => {
    expect(newsroomStateOf(article())).toBe("draft");
    expect(newsroomStateOf(article(), null)).toBe("draft");
    expect(newsroomStateOf(article(), { workflowStatus: null })).toBe("draft");
  });
});

describe("validateArticleDraft", () => {
  const draft = {
    title: { ar: "عنوان", en: "Headline" },
    slug: "a-headline",
    authorDisplayName: { ar: "الإعلام", en: "Media" },
  };

  it("accepts a complete draft", () => {
    expect(hasErrors(validateArticleDraft(draft))).toBe(false);
  });

  it("names each missing half of a bilingual field separately", () => {
    // One error for "the title is wrong" would leave the editor hunting which
    // language it is.
    expect(validateArticleDraft({ ...draft, title: { ar: "عنوان", en: "  " } })).toEqual({ titleEn: true });
    expect(validateArticleDraft({ ...draft, authorDisplayName: { ar: "", en: "Media" } })).toEqual({
      authorAr: true,
    });
  });

  it.each([
    ["spaces", "not a slug"],
    ["an uppercase letter", "Headline"],
    ["a path separator", "news/headline"],
    ["a doubled hyphen", "a--headline"],
    ["Arabic", "عنوان-الخبر"],
    ["nothing at all", ""],
  ])("refuses an address containing %s", (_case, slug) => {
    expect(validateArticleDraft({ ...draft, slug })).toEqual({ slug: true });
  });
});

describe("suggestSlug", () => {
  it("turns a headline into an address", () => {
    expect(suggestSlug("A strong finish to the UAE championship")).toBe(
      "a-strong-finish-to-the-uae-championship",
    );
  });

  it("leaves nothing behind from punctuation or repeated separators", () => {
    expect(suggestSlug("Bronze!  For the team — 2026")).toBe("bronze-for-the-team-2026");
  });

  it("yields nothing for an Arabic headline rather than transliterating it", () => {
    // A transliterated address is one no reader recognises and no editor can
    // check. Empty, and the editor writes their own.
    expect(suggestSlug("نتائج البطولة")).toBe("");
  });
});
