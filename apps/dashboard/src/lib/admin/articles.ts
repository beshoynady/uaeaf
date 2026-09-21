/**
 * The newsroom's shapes and the one place its derived state is worked out.
 *
 * Everything here is either a mirror of an API DTO or a pure function over
 * one. No fetching: the screens read through `fetchAsUser` on the server and
 * write through the generic editorial route handlers, both of which already
 * exist.
 */

export interface LocalizedText {
  ar: string;
  en: string;
}

/** `ARTICLE_CATEGORIES` upstream. Not `externalMediaCoverage`, which is a
 *  separate collection of links to coverage published elsewhere. */
export const ARTICLE_CATEGORIES = ["General", "FederationInMedia"] as const;
export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

/** `ARTICLE_PUBLICATION_STATES` upstream — two values, by owner decision. */
export const ARTICLE_STATES = ["Draft", "Live"] as const;
export type ArticleState = (typeof ARTICLE_STATES)[number];

export interface Article {
  _id: string;
  title: LocalizedText;
  slug: string;
  category: ArticleCategory;
  coverMediaId: string | null;
  body: { ar: unknown; en: unknown };
  authorDisplayName: LocalizedText;
  publishDate: string | null;
  publicationState: ArticleState;
  archived: boolean;
  updatedAt?: string;
  seo?: {
    metaTitle: LocalizedText | null;
    metaDescription: LocalizedText | null;
    ogImageId: string | null;
  } | null;
}

export interface ArticlePage {
  items: Article[];
  total: number;
}

/**
 * What the newsroom calls the state of an article.
 *
 * Six labels from two stored fields and one workflow instance, because the
 * stored state deliberately has only two values (owner decision 2026-09-20)
 * and everything between draft and published is a fact about the review, not
 * about the article. Deriving it here rather than storing it means the list
 * and the editor cannot disagree about what a row is.
 */
export type NewsroomState =
  | "draft"
  | "inReview"
  | "changesRequested"
  | "rejected"
  | "approved"
  | "published"
  | "hidden";

/** The last thing that happened in a review, as the editorial state reports it. */
export interface ReviewSummary {
  workflowStatus: "InProgress" | "Approved" | "Rejected" | "Returned" | null;
  /** True where the last rejection asked for changes rather than refusing. */
  revisionRequested?: boolean;
  /** An approval is standing and nobody has published it yet. */
  approvalWaiting?: boolean;
}

/**
 * The label for one row.
 *
 * Order matters and is not arbitrary: published beats everything, because an
 * article that is live IS live whatever review ran last; hidden is checked
 * first inside that, since it is the more specific fact about a live article.
 * Below the line, the review's own outcome is what a reader of the list wants
 * — "someone asked for changes" is more useful than "draft".
 */
export const newsroomStateOf = (article: Article, review?: ReviewSummary | null): NewsroomState => {
  if (article.publicationState === "Live") {
    return article.archived ? "hidden" : "published";
  }

  switch (review?.workflowStatus) {
    case "InProgress":
      return "inReview";
    case "Approved":
      return "approved";
    case "Returned":
      return "changesRequested";
    case "Rejected":
      // The engine treats a refusal and a request for changes identically —
      // both leave the record in draft and both restart the review. The flag
      // is the only thing that tells the newsroom which the reviewer meant.
      return review.revisionRequested ? "changesRequested" : "rejected";
    default:
      return "draft";
  }
};

/** Message key for a state, so the label lives in the catalogues rather than
 *  being assembled from a value at the call site. */
export const stateMessageKey = (state: NewsroomState): string => `state_${state}`;

/** Message key for a category, for the same reason. */
export const categoryMessageKey = (category: ArticleCategory): string => `category_${category}`;

/**
 * Whether these are the fields the API will accept for a new article.
 *
 * Checked before the request so an editor is told at the field they left empty
 * rather than by a 400 listing property names. The body is not checked here —
 * its rules are the rich-text allowlist's, enforced by the editor itself and
 * again on the server.
 */
export interface ArticleDraftErrors {
  titleAr?: boolean;
  titleEn?: boolean;
  slug?: boolean;
  authorAr?: boolean;
  authorEn?: boolean;
}

/** `ARTICLE_SLUG_PATTERN` upstream: lowercase letters and digits joined by
 *  single hyphens. Latin-only for both languages, because the slug is one
 *  shared URL and a percent-encoded Arabic segment is unreadable wherever a
 *  link is pasted. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const validateArticleDraft = (draft: {
  title: LocalizedText;
  slug: string;
  authorDisplayName: LocalizedText;
}): ArticleDraftErrors => {
  const errors: ArticleDraftErrors = {};
  if (!draft.title.ar.trim()) errors.titleAr = true;
  if (!draft.title.en.trim()) errors.titleEn = true;
  if (!SLUG_PATTERN.test(draft.slug)) errors.slug = true;
  if (!draft.authorDisplayName.ar.trim()) errors.authorAr = true;
  if (!draft.authorDisplayName.en.trim()) errors.authorEn = true;
  return errors;
};

export const hasErrors = (errors: ArticleDraftErrors): boolean => Object.keys(errors).length > 0;

/**
 * A headline turned into an address.
 *
 * English only, and only as a starting suggestion the editor can overwrite:
 * transliterating Arabic would produce an address no reader recognises and no
 * editor can check. An Arabic-only headline yields nothing, and the field
 * stays empty rather than being filled with something meaningless.
 */
export const suggestSlug = (englishTitle: string): string =>
  englishTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120)
    .replace(/-+$/g, "");
