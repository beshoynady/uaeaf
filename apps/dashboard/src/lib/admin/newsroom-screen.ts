import { fetchAsUser, readGrants } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { Article, ArticlePage, ReviewSummary } from "@/lib/admin/articles";
import type { ApproverOption, GovernableEntity } from "@/lib/admin/approval-policies";
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
): Promise<NewsroomScreen<{ articles: Article[]; reviews: Map<string, ReviewSummary> }>> => {
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

  const page = await fetchAsUser<ArticlePage>("/articles?limit=200", locale);
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

  return { status: "ready", data: { articles: page.items, reviews } };
};

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
