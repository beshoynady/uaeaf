import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { performLogin, translateLoginFailure } from "./login";
import { UpstreamError } from "../api/upstream";

const TOKENS = { accessToken: "access-token", refreshToken: "refresh-token" };

beforeEach(() => {
  process.env.UAEAF_API_URL = "http://localhost:3000";
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Responds to /auth/login with tokens and to /users/me with `me`. */
function stubApi(me: unknown, meStatus = 200) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.endsWith("/auth/login")) {
      return new Response(JSON.stringify(TOKENS), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return new Response(JSON.stringify(me), {
      status: meStatus,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("performLogin", () => {
  const credentials = { email: "admin@uaeaf.ae", password: "secret" };

  it("returns the tokens and honours the user's stored language and theme", async () => {
    stubApi({ preferredLanguage: "en", preferredTheme: "dark" });

    const outcome = await performLogin(credentials, "ar");

    expect(outcome.tokens).toEqual(TOKENS);
    expect(outcome.locale).toBe("en");
    expect(outcome.theme).toBe("dark");
  });

  it("reads the profile with the freshly issued access token", async () => {
    const fetchMock = stubApi({ preferredLanguage: null, preferredTheme: null });

    await performLogin(credentials, "ar");

    const meCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/users/me"));
    expect(meCall).toBeDefined();
    const [, init] = meCall as unknown as [string, RequestInit];
    expect(new Headers(init.headers).get("authorization")).toBe("Bearer access-token");
  });

  it("keeps the locale the user logged in from when they have no stored preference", async () => {
    stubApi({ preferredLanguage: null, preferredTheme: null });

    const outcome = await performLogin(credentials, "en");

    expect(outcome.locale).toBe("en");
    expect(outcome.theme).toBeNull();
  });

  it("ignores a preferredLanguage this app does not support", async () => {
    // The users schema constrains this to ar/en, but the dashboard must not
    // redirect to /fr/ on the strength of a value it cannot render.
    stubApi({ preferredLanguage: "fr", preferredTheme: "dark" });

    const outcome = await performLogin(credentials, "ar");

    expect(outcome.locale).toBe("ar");
  });

  it("ignores a preferredTheme this app does not support", async () => {
    // `high-contrast` exists as a token file but is not wired to a control
    // (S12), so it is deliberately absent from USER_THEMES — a stale row
    // holding it must not produce an unrenderable data-theme.
    stubApi({ preferredLanguage: "ar", preferredTheme: "high-contrast" });

    expect((await performLogin(credentials, "ar")).theme).toBeNull();
  });

  it("still signs the user in when the profile read fails", async () => {
    // The credentials were already accepted and the session row already
    // exists upstream. Failing the login now would leave a live session the
    // user cannot reach, over a preference lookup that has a safe default.
    stubApi({ statusCode: 500, message: "boom" }, 500);

    const outcome = await performLogin(credentials, "ar");

    expect(outcome.tokens).toEqual(TOKENS);
    expect(outcome.locale).toBe("ar");
    expect(outcome.theme).toBeNull();
  });
});

describe("translateLoginFailure", () => {
  it("passes the locked-account case through as its own code", () => {
    // AuthService.login deliberately distinguishes this one case; collapsing
    // it into "wrong password" would have the user retry until the lockout
    // extends, with no idea why nothing works.
    const error = new UpstreamError(401, {
      code: "accountLocked",
      message: "Account temporarily locked after repeated failed login attempts. Try again later.",
    });

    expect(translateLoginFailure(error)).toEqual({
      status: 401,
      code: "accountLocked",
      retryAfterSeconds: null,
    });
  });

  it("carries Retry-After through so the screen can run a real countdown", () => {
    // The API does not send this header today. The translation supports it
    // anyway, so the countdown starts working the day the header ships
    // rather than needing this code changed again.
    const error = new UpstreamError(
      401,
      { code: "accountLocked", message: "Wording is not the contract." },
      new Headers({ "retry-after": "540" }),
    );

    expect(translateLoginFailure(error)).toEqual({
      status: 401,
      code: "accountLocked",
      retryAfterSeconds: 540,
    });
  });

  it("does not read a lockout out of the message text", () => {
    // The message is prose and gets reworded; only the code decides. A 401
    // that merely mentions the word must not start a countdown.
    expect(
      translateLoginFailure(
        new UpstreamError(401, { code: "unauthorized", message: "Your account is not locked." }),
      ),
    ).toEqual({ status: 401, code: "invalidCredentials", retryAfterSeconds: null });
  });

  it("reports every other 401 as invalid credentials", () => {
    expect(translateLoginFailure(new UpstreamError(401, { message: "Invalid credentials." }))).toEqual({
      status: 401,
      code: "invalidCredentials",
      retryAfterSeconds: null,
    });
  });

  it("surfaces rate limiting as its own code, with the wait when the throttler gave one", () => {
    expect(translateLoginFailure(new UpstreamError(429, {}))).toEqual({
      status: 429,
      code: "tooManyAttempts",
      retryAfterSeconds: null,
    });

    expect(
      translateLoginFailure(new UpstreamError(429, {}, new Headers({ "retry-after": "45" }))),
    ).toEqual({ status: 429, code: "tooManyAttempts", retryAfterSeconds: 45 });
  });

  it("reports a validation rejection as invalid credentials rather than leaking the DTO error", () => {
    expect(translateLoginFailure(new UpstreamError(400, { message: ["email must be an email"] }))).toEqual({
      status: 401,
      code: "invalidCredentials",
      retryAfterSeconds: null,
    });
  });

  it("reports anything else as an availability problem", () => {
    expect(translateLoginFailure(new Error("connect ECONNREFUSED"))).toEqual({
      status: 502,
      code: "serviceUnavailable",
      retryAfterSeconds: null,
    });
  });
});
