import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callUpstream, UpstreamError } from "./upstream";
import { readAccessToken } from "../auth/session-cookies";

/**
 * The one place the administration screens write through.
 *
 * Every write is a route handler, not a browser fetch: the access token is
 * httpOnly and the API has no CORS, so the browser could not call it even if
 * we wanted it to (owner decision D1). This module holds the parts every one
 * of those handlers repeats — reading the token, forwarding, and turning the
 * API's answer into something the screen can act on.
 *
 * ## Why the error mapping is this specific
 *
 * `PermissionsGuard` and `RolesService`/`UsersController` all answer 403, for
 * four different reasons. Collapsing them into one "forbidden" would leave the
 * administrator staring at a refusal with no idea whether they lack a
 * permission, touched a system role, tried to grant something they do not
 * hold, or edited their own account.
 *
 * They are told apart by the `code` the API stamps on every error body, not
 * by the sentence beside it. Until 2026-09-08 this matched fragments of the
 * English message, and that contract had already broken silently: the refusal
 * on `PATCH /users/:id/status` is worded unlike the self role-assignment one,
 * matched nothing, and reported to the administrator as a missing permission
 * — which no permission would have fixed.
 *
 * An unknown or absent code degrades to the status default — less
 * information, never wrong information.
 */

/**
 * Everything an administration write can fail with, as a runtime list so the
 * copy catalogues can be checked against it (`write-error-copy.spec.ts`).
 * A code with no copy renders as its own key on the screen of the person who
 * just lost their work, and nothing fails until that moment.
 */
export const WRITE_ERROR_CODES = [
  /** The access token was rejected. The write did not happen and will not
   *  happen until the person signs in again. */
  "sessionExpired",
  "forbidden",
  "systemRole",
  "ungrantablePermission",
  "selfAssignment",
  /** The submitted permission set is not a coherent role: it may change a
   *  resource it cannot read. Not an authorization failure — the actor may
   *  hold the missing read — so it is a 400, and the body names the exact
   *  pairs that would fix it. */
  "impliedReadMissing",
  "invalidRequest",
  "notFound",
  "conflict",
  "tooManyRequests",
  "serviceUnavailable",
] as const;

/**
 * Failures only the editorial surfaces can produce — publishing, review and
 * restore (ADR-0069 D4/D5).
 *
 * Kept apart from the list above rather than merged into it because
 * `write-error-copy.spec.ts` checks every code against every surface that can
 * reach it, and these cannot reach the three that predate them: a role
 * assignment has no draft to go stale and no publishing policy to be missing.
 * Merging them would demand copy for "someone edited this record while you
 * were reading it" on the permission matrix — and copy written for a case
 * that cannot happen is copy nobody will ever correct.
 */
export const EDITORIAL_ERROR_CODES = [
  /** No usable publishing policy is configured. Fails closed: drafts still
   *  save, nothing publishes, an administrator must act. */
  "publishingPolicyMissing",
  /** The policy demands approvals, so this may not be published directly. */
  "workflowRequired",
  /** A review is already running on this record. */
  "activeWorkflowExists",
  /** The record changed after it was opened. */
  "staleRecord",
  /** Copy is still marked as awaiting the client. */
  "pendingContent",
  /** A field this type may not be published without is still empty. */
  "missingRequiredField",
  /** A review is in progress and this caller is not handling its step. */
  "underReview",
  /** The submitted rich text used a node, mark or attribute the language's
   *  allowlist does not permit. */
  "richTextNotAllowed",
  /** A list was sent with nothing visible in it, which would take its whole
   *  section off the public page (ADR-0075). */
  "listNeedsVisibleItem",
  /** The order sent was not a permutation of the list's current ids: the list
   *  changed under the editor. */
  "invalidListOrder",
  /** A list name no section carries. */
  "unknownList",
  /** A list drawn as one row was sent longer than the row holds. */
  "listTooLong",
] as const;

/**
 * Failures only the homepage hero screen can produce (owner decisions
 * 2026-09-16 and 2026-09-17). Apart from the editorial list for the same reason
 * that list is apart from the base one: `write-error-copy.spec.ts` asks for
 * copy on every surface a code can reach, and these reach one.
 */
export const HERO_ERROR_CODES = [
  /** A visible button without a label in both languages or without a link. */
  "incompleteCta",
  /** A button label longer than the button holds at 390px. */
  "ctaLabelTooLong",
  /** A button link that is neither an internal path nor an https URL. */
  "invalidCtaUrl",
  /** A separate English picture without the picture or its focal point. */
  "incompleteLtrImage",
  /** A visible slide missing a title, a subtitle or its picture. */
  "incompleteSlide",
  /** A hero text longer than its field holds at 390px. */
  "heroTextTooLong",
  /** A slide's schedule that ends before it starts. */
  "scheduleEndsBeforeStart",
  /** A visible next-event bar with a gap. */
  "incompleteNextEvent",
  /** A next event that ends before it starts. */
  "nextEventEndsBeforeStart",
  /** A slide duration the site does not support. */
  "invalidPlayback",
] as const;

/**
 * Failures only the sponsors, partners and memberships screens can produce
 * (ADR-0085). Four different fixes: move the end after the start; give a
 * championship or event sponsorship the end it must have; point a Federation
 * sponsorship at the federation or at nothing; shorten a name.
 */
export const SPONSOR_RELATION_ERROR_CODES = [
  "sponsorshipEndsBeforeStart",
  "sponsorshipEndRequired",
  "invalidSponsorshipTarget",
  "organizationNameTooLong",
] as const;

export type WriteErrorCode =
  | (typeof WRITE_ERROR_CODES)[number]
  | (typeof EDITORIAL_ERROR_CODES)[number]
  | (typeof HERO_ERROR_CODES)[number]
  | (typeof SPONSOR_RELATION_ERROR_CODES)[number];

/** What a refusal says about where it happened, beside its code. */
export interface FailureDetails {
  field?: string;
  missing?: string[];
  limit?: number;
}

/**
 * The parts of an API refusal that point at a field: which one, which ones are
 * missing, and the limit crossed. Picked one by one and type-checked, so
 * nothing else in the upstream body (a message, a stack) reaches the browser,
 * and a malformed value is dropped rather than trusted.
 */
export const failureDetails = (error: unknown): FailureDetails => {
  if (!(error instanceof UpstreamError) || typeof error.payload !== "object" || error.payload === null) {
    return {};
  }
  const payload = error.payload as Record<string, unknown>;
  const details: FailureDetails = {};
  if (typeof payload.field === "string") details.field = payload.field;
  if (Array.isArray(payload.missing) && payload.missing.every((entry) => typeof entry === "string")) {
    details.missing = payload.missing as string[];
  }
  if (typeof payload.limit === "number") details.limit = payload.limit;
  return details;
};

/** The API returns 200 with an empty body instead of 404 on four routes
 *  (PATCH roles/:id/name, PATCH roles/:id/permissions, DELETE roles/:id,
 *  PATCH users/:id/roles). A caller that treated that as success would tell
 *  the user a change landed on a record that does not exist. */
export class MissingRecordError extends Error {}

/**
 * The whole pipe: session boundary, upstream call, empty-body guard, failure
 * vocabulary. Both exported doors are this function — they differ only in
 * whether they carry a method and a body, and every line they shared was a
 * line that could be fixed in one and left broken in the other.
 */
const forward = async (
  path: string,
  init?: { method: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
): Promise<NextResponse> => {
  const store = await cookies();
  const accessToken = readAccessToken((name) => store.get(name)?.value);
  if (!accessToken) {
    return NextResponse.json({ code: "sessionExpired" }, { status: 401 });
  }

  try {
    const result = await callUpstream<unknown>(path, { ...init, accessToken });
    if (result === null || result === undefined) {
      throw new MissingRecordError(path);
    }
    return NextResponse.json(result);
  } catch (error) {
    const { status, code } = classifyWriteFailure(error);
    return NextResponse.json({ code, ...failureDetails(error) }, { status });
  }
};

export const forwardWrite = async (
  path: string,
  // PUT is here for the singleton content pages: there is exactly one
  // row of each, it may not exist yet, and the API upserts it.
  init: { method: "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown },
): Promise<NextResponse> => {
  return forward(path, init);
};

/**
 * The read half of the same pipe.
 *
 * The status panel re-reads its state from the browser — on an explicit
 * refresh and after every decision — so that read needs a route handler for
 * exactly the reason every write has one: the access token is httpOnly and
 * the API has no CORS, so the browser cannot call it directly.
 *
 * It reuses `classifyWriteFailure` rather than growing a second error
 * vocabulary. A refused read and a refused write fail for the same reasons
 * here — an expired session, a missing permission, a record that is gone —
 * and a screen that had two names for each would need two sets of copy for
 * one situation.
 */
export const forwardRead = async (path: string): Promise<NextResponse> => {
  return forward(path);
};

export const classifyWriteFailure = (error: unknown): { status: number; code: WriteErrorCode } => {
  if (error instanceof MissingRecordError) {
    return { status: 404, code: "notFound" };
  }

  if (!(error instanceof UpstreamError)) {
    return { status: 502, code: "serviceUnavailable" };
  }

  const status = STATUS_PASSTHROUGH.has(error.status) ? error.status : 502;
  return { status, code: FROM_API_CODE[error.apiCode ?? ""] ?? fallbackFor(status) };
};

/** Statuses the browser is told verbatim. Anything else — a 500, a 502 from a
 *  proxy, an unmapped 4xx — becomes a 502: the screen's only useful reaction
 *  to all of them is the same. */
const STATUS_PASSTHROUGH = new Set([400, 401, 403, 404, 409, 429]);

/** The API's vocabulary (api/src/common/errors/api-error-code.ts) translated
 *  into this app's. Kept as an explicit map rather than a pass-through so a
 *  code added upstream cannot reach a screen that has no copy for it. */
const FROM_API_CODE: Record<string, WriteErrorCode> = {
  badRequest: "invalidRequest",
  unauthorized: "sessionExpired",
  forbidden: "forbidden",
  notFound: "notFound",
  conflict: "conflict",
  tooManyRequests: "tooManyRequests",
  internalError: "serviceUnavailable",
  systemRole: "systemRole",
  ungrantablePermission: "ungrantablePermission",
  selfAssignment: "selfAssignment",
  impliedReadMissing: "impliedReadMissing",
  // ADR-0069 D4/D5. Each prevents the task, so each carries its own words:
  // "nobody has configured this yet", "someone edited this while you were
  // reading it" and "the portrait is missing" are three different problems
  // for three different people.
  publishingPolicyMissing: "publishingPolicyMissing",
  workflowRequired: "workflowRequired",
  activeWorkflowExists: "activeWorkflowExists",
  staleRecord: "staleRecord",
  pendingContent: "pendingContent",
  missingRequiredField: "missingRequiredField",
  underReview: "underReview",
  richTextNotAllowed: "richTextNotAllowed",
  // ADR-0075's list refusals: each names a different thing to do — show an
  // item again, reload a list that changed, correct a list name, or remove an
  // item from a full row.
  listNeedsVisibleItem: "listNeedsVisibleItem",
  invalidListOrder: "invalidListOrder",
  unknownList: "unknownList",
  listTooLong: "listTooLong",
  incompleteCta: "incompleteCta",
  ctaLabelTooLong: "ctaLabelTooLong",
  invalidCtaUrl: "invalidCtaUrl",
  sponsorshipEndsBeforeStart: "sponsorshipEndsBeforeStart",
  sponsorshipEndRequired: "sponsorshipEndRequired",
  invalidSponsorshipTarget: "invalidSponsorshipTarget",
  organizationNameTooLong: "organizationNameTooLong",
  incompleteLtrImage: "incompleteLtrImage",
  incompleteSlide: "incompleteSlide",
  heroTextTooLong: "heroTextTooLong",
  incompleteNextEvent: "incompleteNextEvent",
  nextEventEndsBeforeStart: "nextEventEndsBeforeStart",
  scheduleEndsBeforeStart: "scheduleEndsBeforeStart",
  invalidPlayback: "invalidPlayback",
};

const fallbackFor = (status: number): WriteErrorCode => {
  switch (status) {
    case 400:
      return "invalidRequest";
    case 401:
      // Conclusive on its own: nothing else answers 401 to a request that
      // carried a bearer token, so the code is not needed to be sure.
      return "sessionExpired";
    case 403:
      return "forbidden";
    case 404:
      // Real now. Until the API's four empty-200 routes were fixed on
      // 2026-09-08 a missing record came back as a success with no body,
      // which MissingRecordError above still catches for any route that
      // regresses.
      return "notFound";
    case 409:
      // A taken email. `UsersService.create` catches the duplicate key and
      // the global filter is the net behind it, so this is the API's own
      // answer — it used to arrive as a bare 500 and had to be inferred.
      return "conflict";
    case 429:
      return "tooManyRequests";
    default:
      return "serviceUnavailable";
  }
};
