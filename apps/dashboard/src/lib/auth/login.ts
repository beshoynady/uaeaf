import { callUpstream, UpstreamError } from "../api/upstream";
import { parseRetryAfter } from "./lockout";
import { isAppLocale, type AppLocale } from "@/i18n/routing";

/**
 * The login half of the BFF, kept out of the route handler so the decisions
 * it makes — which locale to land on, what a failure means — are testable
 * without a running Next.js server.
 */

/** Mirrors USER_THEMES in api/src/.../user.schema.ts. `high-contrast` is
 *  deliberately absent there (no control is wired to it, S12), so it is
 *  absent here too. */
const SUPPORTED_THEMES = ["light", "dark"] as const;
export type DashboardTheme = (typeof SUPPORTED_THEMES)[number];

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginOutcome {
  tokens: { accessToken: string; refreshToken: string };
  /** Where to send the browser: the user's stored preference when they have
   *  one, otherwise the locale they were already looking at. */
  locale: AppLocale;
  /** `null` means "follow the OS", exactly as the nullable column does. */
  theme: DashboardTheme | null;
}

export type LoginErrorCode =
  | "invalidCredentials"
  | "accountLocked"
  | "tooManyAttempts"
  | "serviceUnavailable";

export async function performLogin(
  credentials: LoginCredentials,
  requestLocale: AppLocale,
): Promise<LoginOutcome> {
  const tokens = await callUpstream<{ accessToken: string; refreshToken: string }>("/auth/login", {
    method: "POST",
    body: credentials,
  });

  const profile = await readProfile(tokens.accessToken);

  return {
    tokens,
    locale: isAppLocale(profile?.preferredLanguage) ? profile.preferredLanguage : requestLocale,
    theme: isSupportedTheme(profile?.preferredTheme) ? profile.preferredTheme : null,
  };
}

/** Deliberately swallows its own failure. By this point the credentials have
 *  been accepted and an authSessions row exists upstream; refusing to
 *  complete the login over a preferences read would strand the user with a
 *  live session they cannot use, to avoid a default that is already safe. */
async function readProfile(
  accessToken: string,
): Promise<{ preferredLanguage?: unknown; preferredTheme?: unknown } | null> {
  try {
    return await callUpstream("/users/me", { accessToken });
  } catch {
    return null;
  }
}

function isSupportedTheme(value: unknown): value is DashboardTheme {
  return typeof value === "string" && (SUPPORTED_THEMES as readonly string[]).includes(value);
}

/**
 * Maps an upstream failure to what the browser is told.
 *
 * Note the 400 case: a DTO rejection means the submitted email or password
 * failed validation. Reporting it as 400 with the validator's own text would
 * tell an attacker which field was malformed; reporting it as 401 keeps the
 * endpoint's answer uniform — the same reasoning AuthService applies when it
 * returns one message for both an unknown email and a wrong password.
 */
export interface LoginFailure {
  status: number;
  code: LoginErrorCode;
  /** Seconds the browser should wait, when the API said. `null` — the only
   *  value the API produces today — means the screen must state the policy
   *  instead of counting down. See lib/auth/lockout.ts. */
  retryAfterSeconds: number | null;
}

export function translateLoginFailure(error: unknown): LoginFailure {
  if (!(error instanceof UpstreamError)) {
    return { status: 502, code: "serviceUnavailable", retryAfterSeconds: null };
  }

  const retryAfterSeconds = parseRetryAfter(error.headers.get("retry-after"), Date.now());

  if (error.status === 429) {
    return { status: 429, code: "tooManyAttempts", retryAfterSeconds };
  }

  if (error.status === 401) {
    // The status is 401 either way, so the lockout is identified by the code
    // the API stamps on it (ADR-0058). It used to be identified by matching
    // the word "locked" in the message, which made a user-facing countdown
    // depend on wording nothing enforced. An older API build, or any body
    // without the code, degrades to the generic "invalid credentials" — the
    // safe direction to fail in: less information, never more.
    const locked = error.apiCode === "accountLocked";
    return {
      status: 401,
      code: locked ? "accountLocked" : "invalidCredentials",
      // Only a lockout has a wait. A wrong password does not, and echoing a
      // stray header on that path would start a countdown over a form the
      // user can retry immediately.
      retryAfterSeconds: locked ? retryAfterSeconds : null,
    };
  }

  if (error.status === 400) {
    return { status: 401, code: "invalidCredentials", retryAfterSeconds: null };
  }

  return { status: 502, code: "serviceUnavailable", retryAfterSeconds: null };
}
