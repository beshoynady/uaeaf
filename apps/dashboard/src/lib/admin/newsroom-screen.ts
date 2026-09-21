import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { toMediaOptions } from "@/lib/admin/media-options";
import { editorialStatePath, findEditorialEntity } from "@/lib/admin/editorial-entities";
import type { Article, ArticlePage, ReviewSummary } from "@/lib/admin/articles";
import type { ArticleEditorResponse } from "@/lib/admin/article-editor";
import type { ApproverOption, GovernableEntity } from "@/lib/admin/approval-policies";
import type { EditorialState } from "@/lib/admin/editorial-state";
import type { MediaAssetOption } from "@/components/admin/pages/media-picker";
import type { AppLocale } from "@/i18n/routing";

/**
 * What each newsroom screen reads before it draws.
 *
 * The same shape `loadEditorialScreen` established for the singleton pages:
 * the permission check is decided on the server before any record reaches the
 * browser, refused is distinguished from absent, and a read the caller is not
 * allowed is an absence rather than an error.
 */

export type NewsroomScreen<T> = { status: "denied" } | { status: "ready"; data: T };

const denied = { status: "denied" } as const;

/**
 * The article list, with the review behind each row.
 *
 * Two reads rather than one: the listing answers what the articles are, and
 * the editorial state answers what is happening to each. They are separate
 * upstream because the second is generic over all twelve governed types, and
 * joining them here costs one request per row on a page of rows — which is
 * what a newsroom page is.
 */
export const loadArticleList = async (
  locale: AppLocale,
): Promise<
  NewsroomScreen<{
    articles: Article[];
    reviews: Map<string, ReviewSummary>;
    canCreate: boolean;
    summary: NewsroomSummary | null;
  }>
> => {
  const grants = await readGrants(locale);

  // Three jobs open this screen. Reading alone does not: the list exists to be
  // worked from, and a reader with no action available has been shown a
  // worklist they cannot use.
  const mayWork =
    hasPermission(grants, "articles", "Update") ||
    hasPermission(grants, "articles", "Publish") ||
    hasPermission(grants, "workflowInstances", "Approve");
  if (!mayWork) {
    return denied;
  }

  // The listing and the numbers together: the cards sit above the rows and
  // one read for both means they describe the same moment. `summary` refused
  // or unavailable costs the cards and not the list — a newsroom can be worked
  // without its own statistics.
  const [page, summary] = await Promise.all([
    fetchAsUser<ArticlePage>("/articles?limit=200", locale),
    fetchAsUser<NewsroomSummary>("/articles/summary", locale),
  ]);
  if (page === null) {
    return denied;
  }

  const reviews = new Map<string, ReviewSummary>();
  await Promise.all(
    page.items.map(async (article) => {
      const state = await fetchAsUser<{
        workflowStatus: ReviewSummary["workflowStatus"];
        history?: { action: string; revisionRequested?: boolean }[];
      }>(`/articles/${article._id}/editorial-state`, locale);

      if (!state) return;

      // The flag lives on the review ACTION, not on the instance, so the
      // latest rejection is what says whether changes were asked for.
      const lastRejection = state.history?.find((entry) => entry.action === "Rejected");
      reviews.set(article._id, {
        workflowStatus: state.workflowStatus,
        revisionRequested: lastRejection?.revisionRequested ?? false,
      });
    }),
  );

  // Writing and starting are separate grants upstream, and the list is opened
  // by three jobs. Offering a control the API would refuse is the failure this
  // answers: the link is drawn from the same grant the route checks.
  return {
    status: "ready",
    data: {
      articles: page.items,
      reviews,
      canCreate: hasPermission(grants, "articles", "Create"),
      summary,
    },
  };
};

/**
 * The newsroom's own numbers, exactly as `GET /articles/summary` reports them.
 *
 * Counted by the database in one pass, not assembled here from the rows a page
 * happens to hold: the listing is paginated, so a count taken from it would
 * describe that page while being labelled as the newsroom, and would change as
 * somebody paged.
 */
export interface NewsroomSummary {
  byState: Record<string, number>;
  byCategory: Record<string, number>;
  /** Published and hidden from the feed — inside `byState.Live` too. */
  archived: number;
  inReview: number;
  awaitingPublication: number;
  changesRequested: number;
}

/** One review waiting on the caller, joined to the article it concerns. */
export interface PendingReview {
  instanceId: string;
  entityId: string;
  startedAt: string | null;
}

/**
 * The caller's own queue.
 *
 * The scoping is entirely the server's: `pending-mine` reads the caller's
 * identity from their token and takes no user parameter, precisely so that no
 * screen can ask for somebody else's worklist.
 */
export const loadReviewQueue = async (
  locale: AppLocale,
): Promise<NewsroomScreen<{ pending: PendingReview[]; articles: Map<string, Article> }>> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "workflowInstances", "Approve")) {
    return denied;
  }

  const pending = await fetchAsUser<
    { _id: string; entityType: string; entityId: string; startedAt: string | null }[]
  >("/workflow-instances/pending-mine", locale);
  if (pending === null) {
    return denied;
  }

  // Only the articles. The queue is generic over every governed type, and this
  // screen is the newsroom's — the others get their own when they are built.
  const articleReviews = pending.filter((instance) => instance.entityType === "articles");

  const articles = new Map<string, Article>();
  await Promise.all(
    articleReviews.map(async (instance) => {
      const article = await fetchAsUser<Article>(`/articles/${instance.entityId}`, locale);
      if (article) articles.set(instance.entityId, article);
    }),
  );

  return {
    status: "ready",
    data: {
      pending: articleReviews.map((instance) => ({
        instanceId: instance._id,
        entityId: instance.entityId,
        startedAt: instance.startedAt,
      })),
      articles,
    },
  };
};


/** What the article editor draws, for a new article or an existing one. */
export interface ArticleEditorScreen {
  /** Null while creating: there is no record yet. */
  record: ArticleEditorResponse | null;
  takenSlugs: string[];
  images: MediaAssetOption[];
  canEdit: boolean;
  canReadMedia: boolean;
  editorial: EditorialState | null;
}

/**
 * Everything the article editor reads before it draws.
 *
 * Its own loader rather than `loadEditorialScreen`, for one reason that
 * matters: that loader reads a type's whole collection and picks a row out of
 * it, which is right for a singleton page and wrong for a newsroom. An article
 * is fetched by its own id.
 *
 * The rest follows the same rules as every editorial screen:
 *
 * - The permission check is decided on the server before any of the record
 *   reaches the browser. Hiding a link is presentation; anyone can type a URL.
 * - Two grants, two jobs: the editor writes, and the approver must read what
 *   they are approving, so the screen opens for either and goes read-only for
 *   the one who cannot write.
 * - Refused is not absent. `null` from the API is a refusal; a missing article
 *   is a `notFound`.
 * - The image library and the editorial state are independent reads. Either
 *   refused costs a panel, not the screen.
 *
 * `takenSlugs` is read for the address field's live check. It is a page of the
 * listing, not every article ever written: past that page an unavailable
 * address reads as free here and is refused by the server's unique index at
 * the save, which is where the guarantee actually lives.
 */
const SLUG_SCAN_LIMIT = 200;

export const loadArticleEditor = async (
  locale: AppLocale,
  id: string | null,
): Promise<NewsroomScreen<ArticleEditorScreen> | { status: "notFound" }> => {
  const grants = await readGrants(locale);
  const canEdit = hasPermission(grants, "articles", id === null ? "Create" : "Update");
  const canReview = id !== null && hasPermission(grants, "workflowInstances", "Approve");

  if (!canEdit && !canReview) {
    return denied;
  }

  const [record, media, page] = await Promise.all([
    id === null ? Promise.resolve(null) : fetchAsUser<ArticleEditorResponse>(`/articles/${id}`, locale),
    fetchAsUser<unknown[]>("/media-assets", locale),
    fetchAsUser<ArticlePage>(`/articles?limit=${SLUG_SCAN_LIMIT}`, locale),
  ]);

  if (id !== null && record === null) {
    // The read is permitted — the grant was checked above — so an absent
    // record is an address that names nothing, not a refusal. Reporting it as
    // denied would send an editor looking for a permission they already hold.
    return { status: "notFound" };
  }

  // The article's own address is not taken by anybody else, so a headline
  // correction never reports the page's own URL as a collision.
  const takenSlugs = (page?.items ?? [])
    .filter((article) => article._id !== id)
    .map((article) => article.slug);

  const entity = findEditorialEntity("articles");
  const editorial =
    record && entity ? await fetchAsUser<EditorialState>(editorialStatePath(entity, record._id), locale) : null;

  return {
    status: "ready",
    data: {
      record,
      takenSlugs,
      // Mapped, not forwarded: the API's id is `_id`, and the picker matches
      // the stored image by `id`.
      images: toMediaOptions(media),
      canEdit,
      canReadMedia: media !== null,
      editorial,
    },
  };
};

/** The policy screen: every governable type, and the people who could decide. */
export const loadApprovalPolicies = async (
  locale: AppLocale,
): Promise<NewsroomScreen<{ entities: GovernableEntity[]; approvers: ApproverOption[] }>> => {
  const grants = await readGrants(locale);
  if (!hasPermission(grants, "workflowPolicies", "Update")) {
    return denied;
  }

  const [entities, users] = await Promise.all([
    fetchAsUser<GovernableEntity[]>("/workflow-policies/governable", locale),
    fetchAsUser<{ items?: unknown[] } | unknown[]>("/users?limit=200", locale),
  ]);

  if (entities === null) {
    return denied;
  }

  // The users route has been paginated and unpaginated at different points;
  // reading both shapes costs nothing and removes a class of empty screen.
  //
  // `id`, not `_id`: `UserResponseDto` renames it on the way out, unlike the
  // article routes which return the raw document. Reading the wrong one was
  // silent twice over — every approver got `key={undefined}`, and the checked
  // test `approverIds.includes(user.id)` compared against `undefined`, so the
  // screen showed nobody selected on a policy that had approvers.
  const rows = (Array.isArray(users) ? users : (users?.items ?? [])) as {
    id?: string;
    _id?: string;
    name?: { ar?: string; en?: string };
    email: string;
  }[];

  return {
    status: "ready",
    data: {
      entities,
      approvers: rows.flatMap((user) => {
        const id = user.id ?? user._id;
        // A row with no identity cannot be named as an approver, and drawing
        // it would give the administrator a control that silently does
        // nothing.
        return id
          ? [{ id, name: { ar: user.name?.ar ?? "", en: user.name?.en ?? "" }, email: user.email }]
          : [];
      }),
    },
  };
};
