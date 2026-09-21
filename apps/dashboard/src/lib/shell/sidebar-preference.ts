/**
 * Whether the sidebar is collapsed, held where the server can read it.
 *
 * Chapter 8 L3 §N.9 asks for the collapsed state to survive a refresh. It is a
 * cookie rather than `localStorage` because the layout renders on the server:
 * a value only the browser can read would draw every page expanded and then
 * snap it shut after hydration, a visible jump on every navigation. Read from
 * the request, the first paint is already the width the administrator chose —
 * the same reason the theme preference is a cookie (`THEME_COOKIE`).
 *
 * Readable by script on purpose, like the theme: it holds a presentation
 * preference, never an identity, and the toggle writes it without a round trip.
 */
export const SIDEBAR_COOKIE = "uaeaf_admin_sidebar";

const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;

/** Only the exact stored word collapses it; expanded is the documented default
 *  at lg+ (Chapter 12 §12.4), so anything else lands there. */
export const isSidebarCollapsed = (value: string | undefined): boolean => value === "collapsed";

export const sidebarCookie = (collapsed: boolean): string =>
  `${SIDEBAR_COOKIE}=${collapsed ? "collapsed" : "expanded"}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;

/**
 * Which navigation groups the administrator has folded or unfolded
 * (ADR-0090 D4), kept like the collapsed state and for the same reason: the
 * server reads it, so the first paint already has them folded.
 *
 * Only the groups somebody chose are held. A group with no entry takes its
 * default — open when it holds the current screen — so an absent key must stay
 * absent rather than read as closed. `key:1|key:0`, because a comma is not a
 * character a cookie value may hold.
 */
export const NAV_GROUPS_COOKIE = "uaeaf_admin_nav_groups";

export const parseNavGroups = (value: string | undefined): Record<string, boolean> =>
  Object.fromEntries(
    (value ?? "")
      .split("|")
      .map((entry) => /^([A-Za-z0-9]+):([01])$/.exec(entry))
      .flatMap((match) => (match ? [[match[1], match[2] === "1"]] : [])),
  );

export const navGroupsCookie = (groups: Record<string, boolean>): string =>
  `${NAV_GROUPS_COOKIE}=${Object.entries(groups)
    .map(([key, open]) => `${key}:${open ? 1 : 0}`)
    .join("|")}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
