import { editorialDraft, type PageSeo, type SeoDraft } from "@/lib/admin/editorial-draft";
import { SLUG_PATTERN, type ArticleCategory, type ArticleTopic, type LocalizedText } from "@/lib/admin/articles";

/**
 * One article as its editor holds it.
 *
 * The draft's two shapes and its save body come from `editorialDraft`, like
 * every other governed editor; this file names the fields, their kinds, and
 * the rules the API would apply to them.
 *
 * `publicationState`, `archived`, `publishDate` and `updatedAt` are read by the
 * screen and are deliberately NOT fields of the draft: none of them is
 * something an author types, and publishing is a separate act behind a separate
 * permission. A field absent from the kinds map is never sent, however the
 * draft is mutated.
 */

/**
 * What the API accepts: at most this many labels, each at most this long.
 *
 * Mirrored from `ARTICLE_TAG_MAX` / `ARTICLE_TAG_LENGTH` in
 * `api/src/modules/public-communication/articles/articles.service.ts`. Held
 * here so the control can stop before the save does; the server stays the
 * authority, as it does for the address.
 */
export const ARTICLE_TAG_MAX = 10;
export const ARTICLE_TAG_LENGTH = 40;

export interface ArticleEditorResponse {
  _id: string;
  title: LocalizedText;
  slug: string;
  category: ArticleCategory;
  topic: ArticleTopic | null;
  /** Non-null only on a `FederationInMedia` round-up, and null on the ones
   *  written before the fields existed. */
  sourceOutlet: string | null;
  sourceUrl: string | null;
  tags: string[];
  coverMediaId: string | null;
  body: { ar: unknown; en: unknown };
  authorDisplayName: LocalizedText;
  seo: PageSeo | null;
  publicationState: string;
  archived: boolean;
  publishDate: string | null;
  updatedAt: string;
}

export interface ArticleDraft {
  title: LocalizedText;
  slug: string;
  category: string;
  /** `""` while none is chosen: an unclassified article, or a new one. */
  topic: string;
  /** `""` while unrecorded — a round-up written before the fields existed, or
   *  an article that is not a round-up at all. */
  sourceOutlet: string;
  sourceUrl: string;
  tags: string[];
  coverMediaId: string;
  body: { ar: unknown; en: unknown };
  authorDisplayName: LocalizedText;
  seo: SeoDraft;
}

export const { toDraft, changedFrom, toPatchBody } = editorialDraft<ArticleEditorResponse, ArticleDraft>({
  title: "text",
  slug: "plain",
  category: "plain",
  topic: "plain",
  sourceOutlet: "plain",
  sourceUrl: "plain",
  // Sent whole: a list's meaning is the list, and "the third one changed" is
  // not a patch the API accepts.
  tags: "list",
  coverMediaId: "image",
  body: "document",
  authorDisplayName: "text",
  seo: "seo",
});

/** An empty article, for the create screen. `category` starts at the API's own
 *  default rather than blank, so the first shelf is a choice the author can
 *  change and never an absence they must notice. */
export const emptyArticleDraft = (): ArticleDraft => ({
  title: { ar: "", en: "" },
  slug: "",
  category: "General",
  // Unlike the shelf, no default: the topic is a choice the author makes, and
  // the create button waits for it.
  topic: "",
  // Shown only once the shelf is `FederationInMedia`, and required then.
  sourceOutlet: "",
  sourceUrl: "",
  tags: [],
  coverMediaId: "",
  body: { ar: null, en: null },
  authorDisplayName: { ar: "", en: "" },
  seo: {
    metaTitle: { ar: "", en: "" },
    metaDescription: { ar: "", en: "" },
    ogImageId: "",
  },
});

/**
 * Which fields would make the API refuse this article, and why.
 *
 * Exactly what the API refuses, and nothing the author merely has not got to
 * yet — an empty body is not here, because the API accepts one and stopping a
 * save over it would make an author finish the text before they could keep
 * the headline. `emptyBodyLanguages` reports that separately.
 *
 * `slug: "taken"` is the one that is not a property of the draft alone: it is
 * decided against the addresses other articles hold. The server is still the
 * authority — its partial-unique index is what actually enforces uniqueness,
 * and two authors can pass this check in the same second. This exists so the
 * ordinary collision is a correction at the field rather than a rejected save
 * after the whole form was filled in.
 */
export interface ArticleFieldErrors {
  titleAr?: boolean;
  titleEn?: boolean;
  slug?: "invalid" | "taken";
  authorAr?: boolean;
  authorEn?: boolean;
  /** Only on the create screen: the API requires a topic of a new article and
   *  of nothing else. */
  topic?: boolean;
  /** Only while the article is, or is becoming, a `FederationInMedia`
   *  round-up. `"missing"` and `"invalid"` are different corrections and the
   *  field says which. */
  sourceOutlet?: boolean;
  sourceUrl?: "missing" | "invalid";
}

/**
 * `http:`/`https:` and nothing else, the same rule `CreateArticleDto` applies.
 *
 * Parsed rather than pattern-matched: `new URL` is the only thing that agrees
 * with what a browser will do with the value, and the protocol check is the
 * point — `javascript:` in an href is a script that runs on click, and this
 * value is printed as a link on the public site.
 */
const isHttpUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

/**
 * A round-up that does not say where it came from.
 *
 * Reported beside the fields and never used to block anything, the way
 * `emptyBodyLanguages` is: an article written before these fields existed is
 * marked so an editor can see the gap and fill it, not held hostage until
 * they look up a source they may not have.
 */
export const sourceIsMissing = (draft: ArticleDraft): boolean =>
  draft.category === "FederationInMedia" && (draft.sourceOutlet.trim() === "" || draft.sourceUrl.trim() === "");

/** Whether a ProseMirror document holds anything a reader would see.
 *
 * An editor that has been opened and left alone still produces a document —
 * one empty paragraph — so "not null" is not the same question as "has
 * content", and treating it as such would let an article be submitted for
 * review with a blank body. */
export const richTextIsEmpty = (document: unknown): boolean => {
  if (!document || typeof document !== "object") return true;

  const text = JSON.stringify(document).match(/"text":"((?:[^"\\]|\\.)*)"/g) ?? [];
  return text.every((match) => match.slice(8, -1).trim() === "");
};

export const validateArticle = (
  draft: ArticleDraft,
  takenSlugs: ReadonlySet<string>,
  {
    creating = false,
    categoryWas,
  }: {
    creating?: boolean;
    /** The stored shelf, so an edit that CONVERTS an article into a round-up
     *  is told apart from one that merely edits an existing round-up. The API
     *  draws the same line: the patch carries `category` only when it
     *  changed, and the attribution is required only when it does. */
    categoryWas?: string;
  } = {},
): ArticleFieldErrors => {
  const errors: ArticleFieldErrors = {};

  if (creating && draft.topic === "") errors.topic = true;

  if (draft.category === "FederationInMedia") {
    const becoming = creating || (categoryWas !== undefined && categoryWas !== draft.category);

    if (becoming && draft.sourceOutlet.trim() === "") errors.sourceOutlet = true;
    if (draft.sourceUrl.trim() === "") {
      if (becoming) errors.sourceUrl = "missing";
    } else if (!isHttpUrl(draft.sourceUrl)) {
      // Judged whenever it is filled, not only while converting: an address
      // the author typed is one they meant, and a broken one is worth saying
      // so about even on an article that already exists.
      errors.sourceUrl = "invalid";
    }
  }

  if (!draft.title.ar.trim()) errors.titleAr = true;
  if (!draft.title.en.trim()) errors.titleEn = true;
  if (!draft.authorDisplayName.ar.trim()) errors.authorAr = true;
  if (!draft.authorDisplayName.en.trim()) errors.authorEn = true;

  if (!SLUG_PATTERN.test(draft.slug)) {
    errors.slug = "invalid";
  } else if (takenSlugs.has(draft.slug)) {
    errors.slug = "taken";
  }

  return errors;
};

/**
 * Which languages have no text in them yet.
 *
 * Reported beside the editor and never used to block anything. An article is
 * published in both languages, so an empty English body is a real gap — but
 * it is a gap in work in progress, and a save refused over it would mean the
 * headline could not be kept until the text was finished. What it must not do
 * is go unmentioned until a reviewer opens a blank page.
 */
export const emptyBodyLanguages = (draft: ArticleDraft): ("ar" | "en")[] =>
  (["ar", "en"] as const).filter((language) => richTextIsEmpty(draft.body[language]));

export const hasArticleErrors = (errors: ArticleFieldErrors): boolean => Object.keys(errors).length > 0;

/**
 * The body for `POST /articles`, from a draft that has passed validation.
 *
 * Built separately from `toPatchBody` because creating and editing are
 * different requests: a patch sends what changed, and a create must send every
 * required field whether the author touched it or not. `seo` and
 * `coverMediaId` are sent as `null` when empty, which is what the API's
 * nullable fields mean by absent.
 *
 * The body is the exception: it is required and NOT nullable, and the
 * allowlist validator answers `notADocument` for `null`. An article created
 * before its text is written therefore carries an empty document — the same
 * one TipTap itself produces for an editor nobody has typed in.
 */
const EMPTY_DOCUMENT = { type: "doc", content: [{ type: "paragraph" }] } as const;

export const toCreateBody = (draft: ArticleDraft): Record<string, unknown> => {
  const { metaTitle, metaDescription, ogImageId } = draft.seo;
  const blank = (value: LocalizedText) => value.ar.trim() === "" && value.en.trim() === "";
  const seoIsEmpty = blank(metaTitle) && blank(metaDescription) && ogImageId === "";

  return {
    title: draft.title,
    slug: draft.slug,
    category: draft.category,
    topic: draft.topic,
    // Null rather than "": the API's nullable fields read null as absent, and
    // an empty string would fail the non-empty rule on a field nobody filled.
    sourceOutlet: draft.sourceOutlet.trim() === "" ? null : draft.sourceOutlet.trim(),
    sourceUrl: draft.sourceUrl.trim() === "" ? null : draft.sourceUrl.trim(),
    tags: draft.tags,
    coverMediaId: draft.coverMediaId === "" ? null : draft.coverMediaId,
    body: {
      ar: draft.body.ar ?? EMPTY_DOCUMENT,
      en: draft.body.en ?? EMPTY_DOCUMENT,
    },
    authorDisplayName: draft.authorDisplayName,
    seo: seoIsEmpty
      ? null
      : {
          metaTitle: blank(metaTitle) ? null : metaTitle,
          metaDescription: blank(metaDescription) ? null : metaDescription,
          ogImageId: ogImageId === "" ? null : ogImageId,
        },
  };
};
