import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { callUpstream, UpstreamError } from "@/lib/api/upstream";
import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  isProductionRuntime,
  preferenceCookieOptions,
} from "@/lib/auth/cookies";
import { readAccessToken } from "@/lib/auth/session-cookies";
import { isAppLocale } from "@/i18n/routing";

const THEMES = ["light", "dark"] as const;

/**
 * Persists the language/theme switches to `PATCH /users/me/preferences`.
 *
 * This is the writer that makes those two columns mean something: without
 * it the schema would hold a preference nothing could ever set, and the
 * toggles would only survive until the next device. Only the keys actually
 * sent are forwarded, so changing the theme cannot silently clear the
 * language — the service applies the same rule on its side.
 *
 * The mirrored cookies are what let the server render `dir` and
 * `data-theme` correctly on the very first paint, before any API call.
 */
export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const accessToken = readAccessToken((name) => cookieStore.get(name)?.value);
  if (!accessToken) {
    return NextResponse.json({ code: "unauthenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "invalidBody" }, { status: 400 });
  }

  const source = (body ?? {}) as Record<string, unknown>;
  const update: Record<string, unknown> = {};

  if ("preferredLanguage" in source) {
    const value = source.preferredLanguage;
    if (value !== null && !isAppLocale(value)) {
      return NextResponse.json({ code: "invalidBody" }, { status: 400 });
    }
    update.preferredLanguage = value;
  }

  if ("preferredTheme" in source) {
    const value = source.preferredTheme;
    if (value !== null && !(typeof value === "string" && (THEMES as readonly string[]).includes(value))) {
      return NextResponse.json({ code: "invalidBody" }, { status: 400 });
    }
    update.preferredTheme = value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ code: "invalidBody" }, { status: 400 });
  }

  try {
    await callUpstream("/users/me/preferences", { method: "PATCH", body: update, accessToken });
  } catch (error) {
    const status = error instanceof UpstreamError ? error.status : 502;
    return NextResponse.json({ code: "updateFailed" }, { status });
  }

  const response = new NextResponse(null, { status: 204 });
  const options = preferenceCookieOptions(isProductionRuntime());

  if ("preferredLanguage" in update) {
    const value = update.preferredLanguage;
    if (typeof value === "string") {
      response.cookies.set(LOCALE_COOKIE, value, options);
    } else {
      response.cookies.delete(LOCALE_COOKIE);
    }
  }
  if ("preferredTheme" in update) {
    const value = update.preferredTheme;
    if (typeof value === "string") {
      response.cookies.set(THEME_COOKIE, value, options);
    } else {
      response.cookies.delete(THEME_COOKIE);
    }
  }

  return response;
}
