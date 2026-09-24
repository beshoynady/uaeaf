import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  HOMEPAGE_FOOTER_GRANTS,
  HOMEPAGE_HERO_GRANTS,
  HOMEPAGE_MEMBERSHIPS_GRANTS,
  HOMEPAGE_PARTNERS_GRANTS,
  HOMEPAGE_SPONSOR_STRIP_GRANTS,
  HOMEPAGE_SPONSORS_GRANTS,
  NAV_ITEMS,
  currentScreenHref,
  navScreens,
  visibleNavItems,
} from "./navigation";
import { UNCLASSIFIED_DOMAIN_KEY, domainKeyFor } from "./admin/resource-domains";
import { STATIC_PAGES } from "./admin/static-pages";

describe("navScreens", () => {
  it("lists each screen once, with the group it sits under", () => {
    const screens = navScreens(NAV_ITEMS);
    const policies = screens.find((screen) => screen.key === "approvalPolicies");

    expect(policies).toEqual({ key: "approvalPolicies", href: "/approval-policies", groupKey: "usersAccess" });
    expect(screens.find((screen) => screen.key === "pages")).toEqual({
      key: "pages",
      href: "/pages",
      groupKey: null,
    });
  });

  it("offers no group as a destination of its own", () => {
    // A group's link is its first screen. Listed as well, the search would
    // offer "News" and "News list" as two results that open the same page.
    // `homepage` is deliberately absent from this list: it stopped being a
    // group on 2026-09-24 and is now a screen of its own.
    const keys = navScreens(NAV_ITEMS).map((screen) => screen.key);
    expect(keys).not.toContain("news");
    expect(keys).not.toContain("usersAccess");
  });

  it("keeps the menu's own order", () => {
    const keys = navScreens(NAV_ITEMS).map((screen) => screen.key);
    expect(keys.indexOf("overview")).toBe(0);
    expect(keys.indexOf("newsList")).toBeLessThan(keys.indexOf("newsReview"));
    expect(keys.slice(-3)).toEqual(["users", "roles", "approvalPolicies"]);
  });
});

describe("currentScreenHref", () => {
  const hrefs = ["/", "/users", "/news", "/news/review", "/approval-policies"];

  it("marks one screen when one screen's address sits inside another's", () => {
    // "/news/review" starts with "/news". Matched by prefix alone, "All
    // articles" and "Review" were both the current page.
    expect(currentScreenHref("/news/review", hrefs)).toBe("/news/review");
  });

  it("keeps a screen current on the records beneath it", () => {
    // An article's own editor is part of the list it was opened from.
    expect(currentScreenHref("/news/65f1c2", hrefs)).toBe("/news");
    expect(currentScreenHref("/users/42", hrefs)).toBe("/users");
  });

  it("matches the overview only on itself", () => {
    expect(currentScreenHref("/", hrefs)).toBe("/");
    expect(currentScreenHref("/roles", hrefs)).toBeNull();
  });

  it("matches whole segments, not the start of a word", () => {
    expect(currentScreenHref("/newsletter", hrefs)).toBeNull();
  });
});

describe("the Users & Access group (IA §4.8, amended 2026-09-21)", () => {
  it("holds users, roles and approval policies, last in the sidebar as the IA orders it", () => {
    const last = NAV_ITEMS[NAV_ITEMS.length - 1];
    expect(last.key).toBe("usersAccess");
    expect(last.children?.map((child) => [child.key, child.href])).toEqual([
      ["users", "/users"],
      ["roles", "/roles"],
      ["approvalPolicies", "/approval-policies"],
    ]);
  });

  it("leaves the news group its two newsroom screens", () => {
    const news = NAV_ITEMS.find((item) => item.key === "news");
    expect(news?.children?.map((child) => child.key)).toEqual(["newsList", "newsReview"]);
  });

  it("keeps no top-level link to a screen the group now holds", () => {
    const topLevel = NAV_ITEMS.filter((item) => !item.children).map((item) => item.key);
    expect(topLevel).not.toContain("users");
    expect(topLevel).not.toContain("roles");
  });

  it("shows an administrator who governs approvals only the group, opening on the policies", () => {
    // Before the move the policy grant also revealed the News group, whose
    // first screen that administrator could not open.
    const items = visibleNavItems([{ resourceType: "workflowPolicies", action: "Update" }]);
    expect(items.map((item) => item.key)).toEqual(["overview", "usersAccess"]);
    expect(items[1].href).toBe("/approval-policies");
  });
});

describe("visibleNavItems", () => {
  it("offers no separate permissions destination", () => {
    // The approved IA (01-Information-Architecture.md §4.8) defines ONE
    // screen, "Roles & Permissions", under Users & Access. The catalogue
    // lives on it as a lens, not as a second link: a read-only list of what
    // permissions exist is not a task anyone opens the platform to perform.
    expect(requiredResources().includes("permissions")).toBe(false);
    expect(NAV_ITEMS.some((item) => item.href === "/permissions")).toBe(false);
  });

  it("always keeps the overview, even for a user with no permissions at all", () => {
    // A freshly created account with no role assigned must still land
    // somewhere that explains its own emptiness, not on a blank shell.
    expect(visibleNavItems([]).map((item) => item.key)).toEqual(["overview"]);
  });

  it("reveals a section as soon as the user holds any action on its resource", () => {
    const grants = [{ resourceType: "roles", action: "Read" }];

    const items = visibleNavItems(grants);
    expect(items.map((item) => item.key)).toEqual(["overview", "usersAccess"]);
    expect(items[1].children?.map((child) => child.key)).toEqual(["roles"]);
    expect(items[1].href).toBe("/roles");
  });

  it("shows everything to a fully privileged user, in the declared order", () => {
    // One grant per requirement, using the exact action where the item names
    // one — a link that asks for `Update` is not satisfied by `Read`.
    // A group's screens carry their own requirements, so they are read too.
    const grants = NAV_ITEMS.flatMap((item) => [item, ...(item.children ?? [])]).flatMap((item) =>
      [...(item.requires ?? []), ...(item.requiresAll ?? [])].map((rule) => ({
        resourceType: rule.resourceType,
        action: rule.action ?? "Read",
      })),
    );

    expect(visibleNavItems(grants)).toEqual(NAV_ITEMS);
  });

  it("names resources that the API actually gates on", () => {
    // Guards against a typo'd resourceType here silently hiding a section
    // forever. Checked against the resource map rather than a copy of the
    // list, so adding a section cannot be "fixed" by editing the expected
    // value — a name that is not a real API resource fails.
    const named = requiredResources();

    expect(named.length).toBeGreaterThan(0);
    for (const resource of named) {
      // Every real API resource is in the domain map; an invented one falls
      // through to "unclassified", which is what this catches.
      expect(domainKeyFor(resource)).not.toBe(UNCLASSIFIED_DOMAIN_KEY);
    }
  });

  it("gives the site-pages section a resource one of its own pages gates on", () => {
    // Twelve separate grants upstream, one link. `newsPage` stands for the
    // set: holding any one of them is reason to see the screen, and the
    // screen itself hides the pages the user cannot edit.
    const pages = NAV_ITEMS.find((item) => item.key === "pages");
    expect(pages?.href).toBe("/pages");
    expect(STATIC_PAGES.map((page) => page.resourceType)).toContain(
      pages?.requires?.[0]?.resourceType,
    );
  });
});

/**
 * The president's message is the first screen whose link is not "any action
 * on one resource".
 *
 * Reading it is not a reason to see it: the screen exists to change the
 * message or to decide on a change. Someone holding only
 * `presidentMessagePage:Read` has nothing to do there, and the page itself
 * refuses them — `president-message/page.spec.tsx` covers that half, because
 * hiding a link is presentation and refusing the route is enforcement.
 */
describe("the president's message link", () => {
  const item = () => visibleNavItems.length;

  it.each([
    ["can edit it", { resourceType: "presidentMessagePage", action: "Update" }],
    ["can decide on it", { resourceType: "workflowInstances", action: "Approve" }],
  ])("appears for someone who %s", (_why, grant) => {
    expect(visibleNavItems([grant]).map((entry) => entry.key)).toContain("presidentMessage");
  });

  it.each([
    ["only read the message", { resourceType: "presidentMessagePage", action: "Read" }],
    ["only read workflows", { resourceType: "workflowInstances", action: "Read" }],
    ["hold an unrelated grant", { resourceType: "users", action: "Update" }],
  ])("stays hidden from someone who can %s", (_why, grant) => {
    expect(visibleNavItems([grant]).map((entry) => entry.key)).not.toContain("presidentMessage");
  });

  it("points at the route the page is built at", () => {
    expect(NAV_ITEMS.find((entry) => entry.key === "presidentMessage")?.href).toBe(
      "/president-message",
    );
    expect(item).toBeDefined();
  });
});

describe("the homepage screens' grants and the API catalogue", () => {
  // Every grant the screen checks must be a catalogue row: the seed creates the
  // rows from that list, so a grant missing there is one no administrator of a
  // new environment could ever hold, and the screen would never open.
  it("asks only for grants the API seeds", () => {
    const catalogue = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "api", "src", "common", "constants", "permission-catalogue.ts"), "utf8");
    const missing = [
      ...HOMEPAGE_HERO_GRANTS,
      ...HOMEPAGE_SPONSOR_STRIP_GRANTS,
      ...HOMEPAGE_SPONSORS_GRANTS,
      ...HOMEPAGE_PARTNERS_GRANTS,
      ...HOMEPAGE_MEMBERSHIPS_GRANTS,
      ...HOMEPAGE_FOOTER_GRANTS,
    ].filter(
      ({ resourceType, action }) => !catalogue.includes(`{ resourceType: '${resourceType}', action: '${action}' }`),
    );
    expect(missing).toEqual([]);
  });
});

describe("the homepage entry", () => {
  /**
   * One flat entry, no nested menu (owner decision 2026-09-24).
   *
   * It opens the hero, and the rail inside every `/homepage/*` screen is how a
   * reader moves between sections. The nested menu could only list the six
   * sections that have an editor; the rail lists all eight in the order the
   * page draws them, the two news shelves and the sponsor strip included.
   */

  // Everything one Save on the hero screen can send, and the two reads it
  // opens with.
  const editor = [
    { resourceType: "heroSlides", action: "Read" },
    { resourceType: "heroSlides", action: "Create" },
    { resourceType: "heroSlides", action: "Update" },
    { resourceType: "heroSlides", action: "Delete" },
    { resourceType: "pageSections", action: "Read" },
    { resourceType: "pageSections", action: "Update" },
  ];

  it("opens the hero directly, with no nested menu", () => {
    const homepage = visibleNavItems(editor).find((entry) => entry.key === "homepage");

    expect(homepage?.href).toBe("/homepage/hero");
    // It still carries its screens — that is what decides whether the entry is
    // shown and where it points — but `flat` is what stops them being drawn as
    // a menu.
    expect(homepage?.flat).toBe(true);
  });

  it("points at a section the reader can actually open, not always the hero", () => {
    // A reader who can manage partners and nothing else would be sent to a
    // hero screen that refuses them.
    const partnersOnly = [
      { resourceType: "partnerships", action: "Read" },
      { resourceType: "partnerships", action: "Create" },
      { resourceType: "partnerships", action: "Update" },
      { resourceType: "partnerships", action: "Delete" },
    ];

    expect(visibleNavItems(partnersOnly).find((entry) => entry.key === "homepage")?.href).toBe("/homepage/partners");
  });

  it("is a destination in its own right, unlike a group", () => {
    // A group is excluded from `navScreens` because its link duplicates its
    // first child. This is not a group, so the command palette should offer
    // it.
    expect(navScreens(NAV_ITEMS).map((screen) => screen.key)).toContain("homepage");
  });

  it("appears for someone who can manage only one section", () => {
    // The entry is shown when ANY section editor is reachable, so it never
    // lands on a refusal. Partners alone is enough.
    const partnersOnly = [
      { resourceType: "partnerships", action: "Read" },
      { resourceType: "partnerships", action: "Create" },
      { resourceType: "partnerships", action: "Update" },
      { resourceType: "partnerships", action: "Delete" },
    ];

    expect(visibleNavItems(partnersOnly).map((entry) => entry.key)).toContain("homepage");
  });

  it("stays hidden from someone who can open no section editor at all", () => {
    expect(visibleNavItems([{ resourceType: "heroSlides", action: "Read" }]).map((entry) => entry.key)).not.toContain(
      "homepage",
    );
  });

  it("keeps the footer out of the homepage entry and gives it its own", () => {
    // The footer is on every page of the site, so ordering or hiding it "on
    // the homepage" is not a thing the platform can express — the sections
    // list excludes it for the same reason. It is a screen of its own.
    const footerOnly = [
      { resourceType: "siteSettings", action: "Read" },
      { resourceType: "siteSettings", action: "Update" },
    ];
    const items = visibleNavItems(footerOnly);
    const footer = items.find((entry) => entry.key === "homepageFooter");

    expect(footer?.href).toBe("/homepage/footer");
    expect(items.find((entry) => entry.key === "homepage")).toBeUndefined();
  });
});

/** Every resource any link asks for, however many rules it carries. */
const requiredResources = (): string[] => {
  return NAV_ITEMS.flatMap((item) => [item, ...(item.children ?? [])]).flatMap((item) =>
    (item.requires ?? []).map((rule) => rule.resourceType),
  );
};

describe("the messages link (owner request 2026-09-22)", () => {
  it("follows the Strategic Plan at the top level", () => {
    const keys = NAV_ITEMS.map((item) => item.key);
    expect(keys.indexOf("messages")).toBe(keys.indexOf("strategicPlan") + 1);
    expect(NAV_ITEMS.find((item) => item.key === "messages")?.href).toBe("/messages");
  });

  it("appears for a reader of the messages and for nobody else", () => {
    const keys = (grants: { resourceType: string; action: string }[]) => visibleNavItems(grants).map((item) => item.key);

    expect(keys([{ resourceType: "contactMessages", action: "Read" }])).toContain("messages");
    expect(keys([{ resourceType: "contactMessages", action: "Export" }])).not.toContain("messages");
  });
});
