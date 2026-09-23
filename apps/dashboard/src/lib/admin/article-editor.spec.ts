import { describe, expect, it } from "vitest";
import {
  changedFrom,
  emptyArticleDraft,
  emptyBodyLanguages,
  hasArticleErrors,
  richTextIsEmpty,
  sourceIsMissing,
  toCreateBody,
  toDraft,
  toPatchBody,
  validateArticle,
  type ArticleDraft,
  type ArticleEditorResponse,
} from "./article-editor";

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const record = (overrides: Partial<ArticleEditorResponse> = {}): ArticleEditorResponse => ({
  _id: "a1",
  title: { ar: "بطولة", en: "Championship" },
  slug: "championship-2026",
  category: "General",
  topic: null,
  sourceOutlet: null,
  sourceUrl: null,
  tags: [],
  coverMediaId: "m1",
  body: { ar: paragraph("نص"), en: paragraph("Text") },
  authorDisplayName: { ar: "المحرر", en: "The desk" },
  seo: null,
  publicationState: "Draft",
  archived: false,
  publishDate: null,
  updatedAt: "2026-09-21T08:00:00.000Z",
  ...overrides,
});

const filled = (overrides: Partial<ArticleDraft> = {}): ArticleDraft => ({
  ...emptyArticleDraft(),
  title: { ar: "بطولة", en: "Championship" },
  slug: "championship-2026",
  authorDisplayName: { ar: "المحرر", en: "The desk" },
  body: { ar: paragraph("نص"), en: paragraph("Text") },
  ...overrides,
});

describe("the article draft", () => {
  it("carries only the fields an author types", () => {
    const draft = toDraft(record());

    // Publishing is a separate act behind a separate permission. A draft
    // holding `publicationState` would send it on every save, which is a
    // publication nobody asked for.
    expect(draft).not.toHaveProperty("publicationState");
    expect(draft).not.toHaveProperty("archived");
    expect(draft).not.toHaveProperty("publishDate");
    expect(draft).not.toHaveProperty("_id");
  });

  it("is not dirty the moment it is loaded", () => {
    const original = toDraft(record());

    // An article with no cover and no SEO reads back as "" and an empty SEO
    // block; compared against the stored nulls they must still be equal, or
    // opening a record and touching nothing offers to save it.
    expect(changedFrom(original, original)).toEqual([]);
    expect(changedFrom(toDraft(record({ coverMediaId: null, seo: null })), toDraft(record({ coverMediaId: null, seo: null })))).toEqual([]);
  });

  it("sends only what changed", () => {
    const original = toDraft(record());
    const draft = { ...original, slug: "championship-final-2026" };

    // Two people may have this screen open. A save posting every field would
    // have the second overwrite the first's work with values their own form
    // was loaded with.
    expect(toPatchBody(original, draft)).toEqual({ slug: "championship-final-2026" });
  });

  it("keeps an emptied address as an empty string rather than clearing the field", () => {
    const original = toDraft(record());
    const draft = { ...original, slug: "" };

    // `null` upstream means "clear it", and `slug` is required — a cleared
    // required field is a type error where an empty one is the missing-field
    // message the author can act on.
    expect(toPatchBody(original, draft)).toEqual({ slug: "" });
  });

  it("clears a removed cover with null", () => {
    const original = toDraft(record());

    // The image field DOES mean "clear it" when empty, which is why the two
    // kinds of string are distinguished at all.
    expect(toPatchBody(original, { ...original, coverMediaId: "" })).toEqual({ coverMediaId: null });
  });
});

describe("richTextIsEmpty", () => {
  it("reads an untouched editor as empty", () => {
    // Opening the editor and leaving it alone still produces a document: one
    // empty paragraph. Treating "not null" as "has content" would let an
    // article go to review with a blank body.
    expect(richTextIsEmpty({ type: "doc", content: [{ type: "paragraph" }] })).toBe(true);
    expect(richTextIsEmpty(null)).toBe(true);
  });

  it("reads whitespace as empty", () => {
    expect(richTextIsEmpty(paragraph("   "))).toBe(true);
  });

  it("reads real text as content", () => {
    expect(richTextIsEmpty(paragraph("Text"))).toBe(false);
  });

  it("is not fooled by an escaped quote in the text", () => {
    // The scan reads JSON, so a body containing `"` must not end the match
    // early and leave the rest unexamined.
    expect(richTextIsEmpty(paragraph('" '))).toBe(false);
  });
});

describe("validateArticle", () => {
  it("accepts a complete article", () => {
    expect(hasArticleErrors(validateArticle(filled(), new Set()))).toBe(false);
  });

  it("names each language of a headline separately", () => {
    const errors = validateArticle(filled({ title: { ar: "بطولة", en: "" } }), new Set());

    // The article is published in both languages, so a missing English
    // headline is a missing headline — and saying which one is missing is the
    // difference between a correction and a hunt.
    expect(errors).toEqual({ titleEn: true });
  });

  it("refuses an address that is not a valid segment", () => {
    expect(validateArticle(filled({ slug: "Championship 2026" }), new Set()).slug).toBe("invalid");
  });

  it("refuses an address another article already holds", () => {
    // The server's partial-unique index is the real guard; this is so the
    // ordinary collision is a correction at the field rather than a rejected
    // save after the whole form was filled in.
    expect(validateArticle(filled(), new Set(["championship-2026"])).slug).toBe("taken");
  });

  it("tells an invalid address from a taken one", () => {
    // "Use lowercase and hyphens" and "somebody has this one" are different
    // instructions, and one code for both would give the author the wrong one
    // half the time.
    expect(validateArticle(filled({ slug: "Bad Slug" }), new Set(["bad-slug"])).slug).toBe("invalid");
  });

  it("does not refuse an article whose text is not written yet", () => {
    // The API accepts an empty body. Refusing a save over one would mean an
    // author could not keep the headline until the text was finished — and
    // the headline is often the first thing that exists.
    expect(hasArticleErrors(validateArticle(filled({ body: { ar: null, en: null } }), new Set()))).toBe(false);
  });
});

/**
 * Required on a new article and on nothing else (owner decision 2026-09-22):
 * the articles written before the field existed stay editable and publishable
 * without one, exactly as the API accepts them.
 */
describe("the topic", () => {
  it("is required before a new article can be created", () => {
    expect(validateArticle(filled(), new Set(), { creating: true })).toEqual({ topic: true });
    expect(hasArticleErrors(validateArticle(filled({ topic: "records" }), new Set(), { creating: true }))).toBe(false);
  });

  it("is not required of an article that already exists", () => {
    expect(hasArticleErrors(validateArticle(filled(), new Set()))).toBe(false);
  });

  it("opens an unclassified article clean", () => {
    // Null upstream, empty in the form: opening one must not offer to save it.
    expect(changedFrom(toDraft(record({ topic: null })), toDraft(record({ topic: null })))).toEqual([]);
    expect(toDraft(record({ topic: null })).topic).toBe("");
  });

  it("is sent when a new article is created", () => {
    expect(toCreateBody(filled({ topic: "youth" }))).toMatchObject({ topic: "youth" });
  });
});

/**
 * Where a media round-up came from (owner decision 2026-09-22).
 *
 * The same rule the API enforces, read here so an author is told at the field
 * rather than by a 400 after they have filled the whole form: required when a
 * `FederationInMedia` article is created, and when an edit converts an
 * article into one. Never required of a round-up that already exists and was
 * written before the fields did — those are marked, not blocked.
 */
describe("the coverage source", () => {
  const coverage = (overrides: Partial<ArticleDraft> = {}) =>
    filled({ category: "FederationInMedia", ...overrides });

  it("is required before a new round-up can be created", () => {
    const errors = validateArticle(coverage({ topic: "records" }), new Set(), { creating: true });

    expect(errors.sourceOutlet).toBe(true);
    expect(errors.sourceUrl).toBe("missing");
  });

  it("is satisfied by an outlet and a real address", () => {
    const errors = validateArticle(
      coverage({ topic: "records", sourceOutlet: "Gulf News", sourceUrl: "https://gulfnews.com/sport/x" }),
      new Set(),
      { creating: true },
    );

    expect(hasArticleErrors(errors)).toBe(false);
  });

  it("refuses an address that is not an http(s) one", () => {
    // The public site prints this as a link. `javascript:` in an href is a
    // script that runs on click, and the API refuses it too.
    for (const url of ["gulf news", "javascript:alert(1)", "gulfnews.com/x"]) {
      expect(
        validateArticle(coverage({ topic: "records", sourceOutlet: "Gulf News", sourceUrl: url }), new Set(), {
          creating: true,
        }).sourceUrl,
      ).toBe("invalid");
    }
  });

  it("refuses an outlet name that is only spaces", () => {
    expect(
      validateArticle(
        coverage({ topic: "records", sourceOutlet: "   ", sourceUrl: "https://gulfnews.com/x" }),
        new Set(),
        { creating: true },
      ).sourceOutlet,
    ).toBe(true);
  });

  it("asks a General article for neither", () => {
    expect(hasArticleErrors(validateArticle(filled({ topic: "youth" }), new Set(), { creating: true }))).toBe(false);
  });

  it("does not block an existing round-up that was written without them", () => {
    // A row the backfill left empty stays editable: the author may be fixing
    // a typo in the headline, and holding that save hostage to a field they
    // cannot look up is how an editor gets stuck.
    const errors = validateArticle(coverage(), new Set(), { creating: false, categoryWas: "FederationInMedia" });

    expect(hasArticleErrors(errors)).toBe(false);
  });

  it("requires both the moment an edit converts an article into a round-up", () => {
    // This is the moment the API starts requiring them, because the patch
    // carries the category. Without the check the save would 400 with no
    // field marked.
    const errors = validateArticle(coverage(), new Set(), { creating: false, categoryWas: "General" });

    expect(errors.sourceOutlet).toBe(true);
    expect(errors.sourceUrl).toBe("missing");
  });

  it("still judges an address the author typed on an existing round-up", () => {
    const errors = validateArticle(coverage({ sourceOutlet: "Gulf News", sourceUrl: "not a url" }), new Set(), {
      creating: false,
      categoryWas: "FederationInMedia",
    });

    expect(errors.sourceUrl).toBe("invalid");
  });

  it("reports a round-up whose source is missing, so the form can mark it", () => {
    expect(sourceIsMissing(coverage())).toBe(true);
    expect(sourceIsMissing(coverage({ sourceOutlet: "Gulf News", sourceUrl: "https://gulfnews.com/x" }))).toBe(false);
    // Not a round-up, so there is nothing missing.
    expect(sourceIsMissing(filled())).toBe(false);
  });

  it("opens a round-up with no source clean", () => {
    const stored = record({ category: "FederationInMedia", sourceOutlet: null, sourceUrl: null });

    // Null upstream, empty in the form: opening one must not offer to save it.
    expect(changedFrom(toDraft(stored), toDraft(stored))).toEqual([]);
    expect(toDraft(stored).sourceOutlet).toBe("");
  });

  it("sends both when a new round-up is created, and clears them on a General one", () => {
    expect(
      toCreateBody(coverage({ topic: "records", sourceOutlet: " Gulf News ", sourceUrl: "https://gulfnews.com/x" })),
    ).toMatchObject({ sourceOutlet: "Gulf News", sourceUrl: "https://gulfnews.com/x" });

    // Null rather than "": the API's nullable fields read null as absent, and
    // an empty string would fail the non-empty rule on a field nobody filled.
    expect(toCreateBody(filled({ topic: "youth" }))).toMatchObject({ sourceOutlet: null, sourceUrl: null });
  });
});

describe("emptyBodyLanguages", () => {
  it("names the language that has no text yet", () => {
    expect(emptyBodyLanguages(filled({ body: { ar: paragraph("نص"), en: null } }))).toEqual(["en"]);
  });

  it("names both when neither is written", () => {
    expect(emptyBodyLanguages(filled({ body: { ar: null, en: null } }))).toEqual(["ar", "en"]);
  });

  it("names none when both are written", () => {
    // Said as a notice rather than an error, but it must be said: otherwise
    // the first person to see a blank page is the reviewer.
    expect(emptyBodyLanguages(filled())).toEqual([]);
  });
});

describe("toCreateBody", () => {
  it("sends every required field, touched or not", () => {
    // A patch sends what changed; a create must send what the API requires
    // whether the author typed in it or accepted what was there.
    expect(toCreateBody(filled())).toMatchObject({
      title: { ar: "بطولة", en: "Championship" },
      slug: "championship-2026",
      category: "General",
      authorDisplayName: { ar: "المحرر", en: "The desk" },
    });
  });

  it("sends a real empty document for a body nobody has written", () => {
    const body = toCreateBody(filled({ body: { ar: null, en: null } })) as {
      body: { ar: unknown; en: unknown };
    };

    // `body` is required and NOT nullable upstream, and the allowlist
    // validator answers `notADocument` for null — so sending null would make
    // every article created before its text a 400 nobody could read.
    expect(body.body.ar).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
    expect(body.body.en).toEqual({ type: "doc", content: [{ type: "paragraph" }] });
  });

  it("sends no cover and no search overrides as null", () => {
    const body = toCreateBody(filled());

    // The API's nullable fields read `null` as absent. An empty string would
    // be rejected as a malformed object id.
    expect(body.coverMediaId).toBeNull();
    expect(body.seo).toBeNull();
  });

  it("keeps a partly filled SEO block rather than discarding it", () => {
    const body = toCreateBody(
      filled({
        seo: { metaTitle: { ar: "عنوان", en: "" }, metaDescription: { ar: "", en: "" }, ogImageId: "" },
      }),
    );

    // Writing one of the three and having all three dropped would lose work
    // silently, which is the failure mode an author never sees.
    expect(body.seo).toEqual({
      metaTitle: { ar: "عنوان", en: "" },
      metaDescription: null,
      ogImageId: null,
    });
  });
});
