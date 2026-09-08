import { describe, expect, it } from "vitest";
import { classifyRoute, decideSessionAction } from "./session-policy";

describe("classifyRoute", () => {
  it.each(["/ar/login", "/en/login", "/ar/login/", "/ar/forgot-password", "/en/forgot-password/"])(
    "treats %s as signed-out-only",
    (pathname) => {
      expect(classifyRoute(pathname)).toBe("signedOutOnly");
    },
  );

  it.each(["/ar/reset-password", "/en/reset-password/"])("treats %s as public", (pathname) => {
    // A reset link must open for anyone holding it. Bouncing a signed-in
    // administrator home would silently discard the token in the URL — and
    // the reset revokes every session anyway, so "already signed in" says
    // nothing about whether this link should work.
    expect(classifyRoute(pathname)).toBe("public");
  });

  it.each(["/ar", "/en/users", "/ar/roles", "/ar/logins", "/ar/users/login-history"])(
    "treats %s as protected",
    (pathname) => {
      expect(classifyRoute(pathname)).toBe("protected");
    },
  );

  it("does not match a nested path that merely starts with an auth segment", () => {
    expect(classifyRoute("/ar/login/history")).toBe("protected");
    expect(classifyRoute("/ar/reset-password/confirm")).toBe("protected");
  });
});

describe("decideSessionAction", () => {
  it("lets an anonymous visitor see the login screen", () => {
    expect(
      decideSessionAction({ kind: "signedOutOnly", hasRefreshToken: false, accessTokenUsable: false }),
    ).toBe("allow");
  });

  it("sends an already-signed-in user away from the login screen", () => {
    expect(
      decideSessionAction({ kind: "signedOutOnly", hasRefreshToken: true, accessTokenUsable: true }),
    ).toBe("redirectHome");
  });

  it("sends a user with a stale access token away from login too, so the refresh happens once, in one place", () => {
    // Deliberately NOT "refresh" here: the home route's own stale-token path
    // already refreshes. Duplicating it would mean two code paths that can
    // disagree. If the refresh then fails it clears the cookies and bounces
    // back here — where hasRefreshToken is now false, so this terminates.
    expect(
      decideSessionAction({ kind: "signedOutOnly", hasRefreshToken: true, accessTokenUsable: false }),
    ).toBe("redirectHome");
  });

  it("sends an anonymous visitor on a protected route to login", () => {
    expect(
      decideSessionAction({ kind: "protected", hasRefreshToken: false, accessTokenUsable: false }),
    ).toBe("redirectLogin");
  });

  it("lets a fully signed-in user through", () => {
    expect(
      decideSessionAction({ kind: "protected", hasRefreshToken: true, accessTokenUsable: true }),
    ).toBe("allow");
  });

  it("refreshes when the refresh token outlives the access token", () => {
    // The everyday case: access tokens are short-lived, refresh tokens last
    // 7 days. Without this the user would be logged out every 15 minutes.
    expect(
      decideSessionAction({ kind: "protected", hasRefreshToken: true, accessTokenUsable: false }),
    ).toBe("refresh");
  });

  it("ignores a usable access token with no refresh token behind it", () => {
    // Cookies can be cleared independently (the refresh cookie has a longer
    // lifetime, but a user can delete either). Treating the access token as
    // sufficient would strand the user in a session that dies mid-use with
    // no way to renew; sending them to login now is the honest outcome.
    expect(
      decideSessionAction({ kind: "protected", hasRefreshToken: false, accessTokenUsable: true }),
    ).toBe("redirectLogin");
  });

  it.each([
    [false, false],
    [true, true],
    [true, false],
  ])(
    "always allows a public route (refresh=%s, usable=%s)",
    (hasRefreshToken, accessTokenUsable) => {
      // No redirect and, deliberately, no refresh either: renewing a session
      // on the way into a password reset would rotate tokens that the reset
      // is about to revoke.
      expect(decideSessionAction({ kind: "public", hasRefreshToken, accessTokenUsable })).toBe(
        "allow",
      );
    },
  );
});
