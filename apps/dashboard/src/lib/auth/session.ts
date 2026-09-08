import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { callUpstream, UpstreamError } from "../api/upstream";
import type { MeResponse } from "../api/types";
import type { PermissionGrant } from "./permissions";
import { readAccessToken } from "./session-cookies";
import { decodeAccessToken, type AccessTokenClaims } from "./token";
import type { AppLocale } from "@/i18n/routing";

/**
 * Session access for server components.
 *
 * By the time a page renders, the proxy has already refreshed a stale token
 * and redirected, so the cookie read here is fresh. This module therefore
 * never refreshes: a page cannot set cookies during render anyway (an HTTP
 * constraint, not a Next.js one), so a "refresh" here would mint a token
 * the browser never receives and silently invalidate the one it holds.
 */
export async function readSession(): Promise<AccessTokenClaims | null> {
  const store = await cookies();
  const token = readAccessToken((name) => store.get(name)?.value);
  return token ? decodeAccessToken(token) : null;
}

/** For pages that cannot render without an identity. The proxy normally
 *  redirects first; this is the second line, for the case Next's own docs
 *  warn about — a matcher change silently removing proxy coverage. */
export async function requireSession(locale: AppLocale): Promise<AccessTokenClaims> {
  const session = await readSession();
  if (!session) {
    redirect(`/${locale}/login`);
  }
  return session;
}

/**
 * The signed-in user, with the authority the API resolved for this request.
 *
 * Memoised with React's `cache` so the shell and the page beneath it share
 * one upstream call per render pass. That matters because `permissions`
 * moved out of the access token (owner decision 2026-09-07): without the
 * memo, every server component that needs to know what the user may do
 * would issue its own round trip on every navigation.
 *
 * Returns `null` only on a 403, which GET /users/me cannot produce — it
 * carries no @RequirePermission. A dead session redirects instead.
 */
export const readCurrentUser = cache(
  async (locale: AppLocale): Promise<MeResponse | null> => fetchAsUser<MeResponse>("/users/me", locale),
);

/** What the signed-in user may do, for deciding what to render.
 *
 *  Presentation only — the API re-checks every call. An unreadable profile
 *  yields an empty set, which hides everything rather than advertising
 *  screens whose fetches would then be refused. */
export async function readGrants(locale: AppLocale): Promise<PermissionGrant[]> {
  const me = await readCurrentUser(locale);
  return me?.permissions ?? [];
}

/**
 * Reads from the API as the signed-in user.
 *
 * A 403 is returned as `null` rather than thrown: it means the API refused
 * on permissions, which is a legitimate state for a screen to render ("you
 * cannot see this"), not a crash. A 401 is different — the session is gone,
 * so the honest response is to send the user to log in again.
 */
export async function fetchAsUser<T>(path: string, locale: AppLocale): Promise<T | null> {
  const store = await cookies();
  const token = readAccessToken((name) => store.get(name)?.value);
  if (!token) {
    redirect(`/${locale}/login`);
  }

  try {
    return await callUpstream<T>(path, { accessToken: token });
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 403) {
      return null;
    }
    if (error instanceof UpstreamError && error.status === 401) {
      redirect(`/${locale}/login`);
    }
    throw error;
  }
}
