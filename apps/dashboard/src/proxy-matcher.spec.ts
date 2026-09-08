import { describe, expect, it } from "vitest";
import { config } from "./proxy";

/**
 * Guards the one line that decides whether the session gate runs at all.
 *
 * On 2026-09-07 the matcher read `"/((?!api|_next|_vercel|.*\.".*)` with a
 * single backslash. JavaScript drops it — `"\."` is just `"."` — so the
 * alternative became `.*..*`, which matches any non-empty path. Sitting
 * inside a negative lookahead, that excluded every page, and the proxy
 * never executed on a single request.
 *
 * Nothing failed loudly. Pages still rendered, because each one re-checks
 * the session itself; what was lost was the silent token refresh, so every
 * session died at the 15-minute access-token expiry and the user was
 * returned to the login screen as if they had been logged out.
 *
 * These tests assert the behaviour (which paths the gate covers), not the
 * string, so a future rewrite of the pattern is free as long as coverage
 * holds.
 */
describe("proxy matcher", () => {
  const pattern = config.matcher[0];

  /** Next compiles each matcher entry as a full-path regular expression. */
  const covers = (pathname: string): boolean => new RegExp(`^${pattern}$`).test(pathname);

  it("does not silently degrade to an escape-stripped pattern", () => {
    // The specific regression: a lone backslash before the dot. Read off the
    // compiled value, so it fails whether the mistake is made here or in a
    // future edit.
    expect(pattern).not.toContain(".*..*");
    expect(pattern).toContain("\\.");
  });

  it.each([
    ["the locale root", "/ar"],
    ["the English locale root", "/en"],
    ["the login screen", "/ar/login"],
    ["a signed-in screen", "/ar/roles"],
    ["a nested screen", "/ar/users/507f1f77bcf86cd799439011"],
  ])("gates %s", (_label, pathname) => {
    expect(covers(pathname)).toBe(true);
  });

  it.each([
    ["the BFF route handlers, which establish the session", "/api/auth/login"],
    ["Next internals", "/_next/static/chunks/main.js"],
    ["Vercel internals", "/_vercel/insights"],
    ["a file request", "/favicon.ico"],
    ["a font file", "/fonts/alexandria.woff2"],
  ])("leaves %s alone", (_label, pathname) => {
    expect(covers(pathname)).toBe(false);
  });
});
