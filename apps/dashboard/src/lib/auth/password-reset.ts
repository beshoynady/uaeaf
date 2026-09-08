import { callUpstream, UpstreamError } from "../api/upstream";
import { parseRetryAfter } from "./lockout";
import type { AppLocale } from "@/i18n/routing";

/**
 * The password-recovery half of the BFF.
 *
 * ⚠ The two upstream routes this calls DO NOT EXIST YET (verified
 * 2026-09-08: api/src/.../auth.controller.ts declares only `login`,
 * `refresh`, `logout` and `logout-all`). The `passwordResetToken` and
 * `passwordResetExpiresAt` columns are on the user schema and nothing reads
 * or writes them.
 *
 * This file is therefore the *client half* of a contract the API still owes,
 * written so the screens are complete and so the required API shape is
 * stated in one reviewable place rather than implied across three
 * components:
 *
 *   POST /auth/forgot-password  { email, locale }  -> 202, always, whether
 *     or not the address is registered. Uniformity is the API's job: if it
 *     ever 404s an unknown address, the endpoint leaks which of the
 *     federation's staff have accounts.
 *
 *   POST /auth/reset-password   { token, password } -> 204. The token is
 *     single-use and must be invalidated on success along with every
 *     existing session for that user (the same effect as `logout-all`) —
 *     otherwise a stolen refresh token survives the recovery that was
 *     performed because of it.
 *
 * Until those ship, every call here fails and the screens say the service is
 * unavailable. That is deliberate: the alternative — a "check your email"
 * confirmation for a mail that was never sent — is worse than an outage.
 */

export type ResetErrorCode =
  | "invalidToken"
  | "weakPassword"
  | "tooManyAttempts"
  | "serviceUnavailable";

export interface ResetFailure {
  status: number;
  code: ResetErrorCode;
  retryAfterSeconds: number | null;
}

export async function requestPasswordReset(email: string, locale: AppLocale): Promise<void> {
  // `locale` travels with the request so the API can send the mail in the
  // language the administrator was actually reading.
  await callUpstream("/auth/forgot-password", { method: "POST", body: { email, locale } });
}

export async function submitPasswordReset(token: string, password: string): Promise<void> {
  await callUpstream("/auth/reset-password", { method: "POST", body: { token, password } });
}

export function translateResetRequestFailure(error: unknown): ResetFailure {
  if (error instanceof UpstreamError && error.status === 429) {
    return {
      status: 429,
      code: "tooManyAttempts",
      retryAfterSeconds: parseRetryAfter(error.headers.get("retry-after"), Date.now()),
    };
  }
  // Everything else — 404 for the absent route included — is an availability
  // problem. There is deliberately no branch that turns a failure into the
  // success message.
  return { status: 502, code: "serviceUnavailable", retryAfterSeconds: null };
}

export function translateResetSubmitFailure(error: unknown): ResetFailure {
  if (!(error instanceof UpstreamError)) {
    return { status: 502, code: "serviceUnavailable", retryAfterSeconds: null };
  }

  if (error.status === 429) {
    return {
      status: 429,
      code: "tooManyAttempts",
      retryAfterSeconds: parseRetryAfter(error.headers.get("retry-after"), Date.now()),
    };
  }

  if (error.status === 400 || error.status === 404 || error.status === 410) {
    // Unknown, already used, and expired all produce the same message. The
    // distinction is of no use to the person holding a good link and of real
    // use to someone guessing tokens.
    return {
      status: 400,
      code: mentionsPassword(error.apiMessage) ? "weakPassword" : "invalidToken",
      retryAfterSeconds: null,
    };
  }

  return { status: 502, code: "serviceUnavailable", retryAfterSeconds: null };
}

/** The form already enforces the 12-character minimum, so this branch is
 *  reachable only if the API's rule tightens. Degrading to "invalid token"
 *  would send the user hunting for a new link over a fixable password. */
function mentionsPassword(message: string | null): boolean {
  return message?.toLowerCase().includes("password") ?? false;
}
