import { describe, expect, it } from "vitest";
import {
  NAV_GROUPS_COOKIE,
  SIDEBAR_COOKIE,
  isSidebarCollapsed,
  navGroupsCookie,
  parseNavGroups,
  sidebarCookie,
} from "./sidebar-preference";

describe("parseNavGroups", () => {
  it("reads each group the administrator opened or closed", () => {
    expect(parseNavGroups("news:1|homepage:0")).toEqual({ news: true, homepage: false });
  });

  it("holds nothing for a group nobody has chosen, so its default applies", () => {
    // ADR-0090 D3: with no stored choice a group is open when it holds the
    // current screen. An absent key must stay absent, not read as closed.
    expect(parseNavGroups(undefined)).toEqual({});
    expect(parseNavGroups("")).toEqual({});
  });

  it("skips what it cannot read rather than guessing", () => {
    expect(parseNavGroups("news:1|junk|homepage:yes|:1")).toEqual({ news: true });
  });
});

describe("navGroupsCookie", () => {
  it("writes the choices in the form it reads", () => {
    const cookie = navGroupsCookie({ news: true, homepage: false });
    expect(cookie).toMatch(new RegExp(`^${NAV_GROUPS_COOKIE}=news:1\\|homepage:0;`));
    expect(parseNavGroups(cookie.split(";")[0].split("=")[1])).toEqual({ news: true, homepage: false });
  });

  it("is scoped and kept like the collapsed state", () => {
    const cookie = navGroupsCookie({ news: true });
    expect(cookie).toContain("path=/");
    expect(cookie).toContain("samesite=lax");
    expect(cookie).toMatch(/max-age=\d+/);
  });
});

describe("isSidebarCollapsed", () => {
  it("reads the collapsed preference", () => {
    expect(isSidebarCollapsed("collapsed")).toBe(true);
  });

  it("treats anything else as expanded, because expanded is the documented default", () => {
    // Chapter 12 §12.4: at lg+ the sidebar is expanded. A missing, stale or
    // tampered cookie must land there rather than on a state nobody chose.
    expect(isSidebarCollapsed(undefined)).toBe(false);
    expect(isSidebarCollapsed("expanded")).toBe(false);
    expect(isSidebarCollapsed("junk")).toBe(false);
  });
});

describe("sidebarCookie", () => {
  it("names the preference the layout reads", () => {
    expect(sidebarCookie(true)).toMatch(new RegExp(`^${SIDEBAR_COOKIE}=collapsed;`));
    expect(sidebarCookie(false)).toMatch(new RegExp(`^${SIDEBAR_COOKIE}=expanded;`));
  });

  it("is sent with every dashboard route and outlives the session", () => {
    // Without `path=/` the cookie is scoped to the page that wrote it, and
    // the next screen would render expanded again — the flash this exists
    // to prevent.
    const cookie = sidebarCookie(true);
    expect(cookie).toContain("path=/");
    expect(cookie).toContain("samesite=lax");
    expect(cookie).toMatch(/max-age=\d+/);
  });
});
