import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { classifyWriteFailure, failureDetails } from "@/lib/api/admin-write";
import { callUpstream, UpstreamError } from "@/lib/api/upstream";
import { readAccessToken } from "@/lib/auth/session-cookies";
import type { SeasonErrorCode } from "./error-codes";

/**
 * What the season route handlers share.
 *
 * Not `forwardWrite`, for the reason `albums/route-support.ts` records: the
 * season writes refuse with statuses the shared classifier folds away.
 *
 * - **422** — `SeasonsService` answers it when a season ends before it
 *   starts. `classifyWriteFailure` turns every 422 into a 502 "service
 *   unavailable", which would send the editor to wait for a server rather
 *   than fix a date.
 * - **The two overlaps** arrive under their own codes (`seasonOverlap`,
 *   `seasonPhaseOverlap`), which the shared vocabulary does not know and
 *   would fold into a bare `conflict`; each gets its sentence. A create's
 *   plain `conflict` is the taken address.
 *
 * - **Shared codes whose shared words are wrong or vague here.**
 *   `stillReferenced` on a delete is worded for a media file ("this file is
 *   still used"). `workflowRequired` on a publish, and the plain `conflict` a
 *   submit answers when the policy requires no approval, each point at the
 *   other door, which the season card names. `activeWorkflowExists` on a
 *   submit is a review already running. `missingRequiredField` on a publish or
 *   a submit is, for a season, always the banner — `PUBLISH_REQUIREMENTS.seasons`
 *   lists `bannerId` alone — so the sentence names it.
 *
 * Everything else — a missing permission, a stale record on publish, a
 * missing publishing policy — is the shared vocabulary, so it reads exactly
 * as it does on every other screen.
 */

export type SeasonFailureContext = "create" | "write" | "delete" | "publish" | "submit" | "action";

export const classifySeasonFailure = (
  error: unknown,
  context: SeasonFailureContext,
): { status: number; code: string } => {
  if (error instanceof UpstreamError) {
    const own = (code: SeasonErrorCode, status: number) => ({ status, code });
    if (error.apiCode === "seasonOverlap") return own("seasonOverlap", error.status);
    if (error.apiCode === "seasonPhaseOverlap") return own("seasonPhaseOverlap", error.status);
    if (context === "create" || context === "write") {
      if (error.status === 422) return own("seasonRangeInvalid", 422);
      if (context === "create" && error.status === 409 && error.apiCode === "conflict") return own("seasonSlugTaken", 409);
    }
    if (context === "delete" && error.apiCode === "stillReferenced") return own("seasonHasContent", 409);
    if (context === "publish" && error.apiCode === "workflowRequired") return own("seasonNeedsReview", 409);
    if (context === "submit" && error.apiCode === "conflict") return own("seasonPublishDirectly", 409);
    if (context === "submit" && error.apiCode === "activeWorkflowExists") return own("seasonReviewInProgress", 409);
    if ((context === "publish" || context === "submit") && error.apiCode === "missingRequiredField") {
      return own("seasonBannerMissing", 409);
    }
  }
  return classifyWriteFailure(error);
};

const readToken = async (): Promise<string | null> => {
  const store = await cookies();
  return readAccessToken((name) => store.get(name)?.value) ?? null;
};

/**
 * One upstream call, answered to the browser.
 *
 * Every season route returns the season (or a publish receipt) on success;
 * a 200 with no body is the API's answer for an id that names no season, so
 * it is reported as `notFound` rather than as a success over nothing.
 */
export const forwardSeason = async (
  path: string,
  init: { method: "POST" | "PATCH" | "DELETE"; body?: unknown },
  context: SeasonFailureContext,
): Promise<NextResponse> => {
  const accessToken = await readToken();
  if (!accessToken) return NextResponse.json({ code: "sessionExpired" }, { status: 401 });

  try {
    const result = await callUpstream<unknown>(path, { ...init, accessToken });
    if (result === null || result === undefined) {
      return NextResponse.json({ code: "notFound" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    const { status, code } = classifySeasonFailure(error, context);
    return NextResponse.json({ code, ...failureDetails(error) }, { status });
  }
};
