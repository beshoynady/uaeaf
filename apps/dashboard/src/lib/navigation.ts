import { hasPermission, canAccessResource, type PermissionGrant } from "./auth/permissions";

/**
 * The dashboard's navigation model, held as data so "what a user can reach"
 * is one testable list rather than a permission check scattered across JSX.
 *
 * A requirement names the API resource the screen reads — the same string
 * `@RequirePermission` uses on the controller, which is what keeps the menu
 * honest: a link only appears when the API would actually answer.
 */
export interface NavRequirement {
  resourceType: string;
  /**
   * The exact action, when holding *any* action is not reason enough to see
   * the screen. Omitted for a section a reader has business opening —
   * someone with `roles:Read` still wants the Roles link, they just land on
   * a screen with no edit affordances.
   */
  action?: string;
}

export interface NavItem {
  /** Key into the `Nav` message namespace. */
  key: string;
  href: string;
  /** `null` for screens every authenticated user may open. Otherwise the
   *  link appears when the user satisfies **any one** of these. */
  requires: readonly NavRequirement[] | null;
  /** Held in addition to one of `requires`, all of them: for a screen that
   *  saves to more than one resource and would fail half way without each. */
  requiresAll?: readonly NavRequirement[];
  /** Screens grouped under this entry, each filtered by its own requirements. */
  children?: readonly NavItem[];
}

/**
 * Every grant the homepage hero screen uses: the two reads it opens with, and
 * each write one Save can send (a slide added, changed, reordered or deleted,
 * and the section's settings). The page and its link check the same list.
 */
export const HOMEPAGE_HERO_GRANTS = [
  { resourceType: "heroSlides", action: "Read" },
  { resourceType: "heroSlides", action: "Create" },
  { resourceType: "heroSlides", action: "Update" },
  { resourceType: "heroSlides", action: "Delete" },
  { resourceType: "pageSections", action: "Read" },
  { resourceType: "pageSections", action: "Update" },
] as const satisfies readonly NavRequirement[];

/**
 * Every grant the sponsors screen uses (ADR-0085): sponsors and their
 * sponsorships added, changed and deleted, and the SPONSORS section's banner
 * preference and call to action, which one Save writes with them.
 */
export const HOMEPAGE_SPONSORS_GRANTS = [
  { resourceType: "sponsors", action: "Read" },
  { resourceType: "sponsors", action: "Create" },
  { resourceType: "sponsors", action: "Update" },
  { resourceType: "sponsors", action: "Delete" },
  { resourceType: "sponsorships", action: "Read" },
  { resourceType: "sponsorships", action: "Create" },
  { resourceType: "sponsorships", action: "Update" },
  { resourceType: "sponsorships", action: "Delete" },
  { resourceType: "pageSections", action: "Read" },
  { resourceType: "pageSections", action: "Update" },
] as const satisfies readonly NavRequirement[];

/** Every grant the partners screen uses: its records added, changed, ordered and deleted. */
export const HOMEPAGE_PARTNERS_GRANTS = [
  { resourceType: "partnerships", action: "Read" },
  { resourceType: "partnerships", action: "Create" },
  { resourceType: "partnerships", action: "Update" },
  { resourceType: "partnerships", action: "Delete" },
] as const satisfies readonly NavRequirement[];

/** Every grant the memberships screen uses, for the same reasons. */
export const HOMEPAGE_MEMBERSHIPS_GRANTS = [
  { resourceType: "memberships", action: "Read" },
  { resourceType: "memberships", action: "Create" },
  { resourceType: "memberships", action: "Update" },
  { resourceType: "memberships", action: "Delete" },
] as const satisfies readonly NavRequirement[];

/**
 * Every grant the sponsor strip screen uses: the settings it writes, and the
 * sponsors, sponsorships and section its preview reads to answer as the site.
 */
export const HOMEPAGE_SPONSOR_STRIP_GRANTS = [
  { resourceType: "siteSettings", action: "Read" },
  { resourceType: "siteSettings", action: "Update" },
  { resourceType: "sponsors", action: "Read" },
  { resourceType: "sponsorships", action: "Read" },
  { resourceType: "pageSections", action: "Read" },
] as const satisfies readonly NavRequirement[];

/** A homepage screen's link: shown with every grant its Save can use. */
const homepageScreen = (key: string, href: string, grants: readonly NavRequirement[]): NavItem => ({
  key,
  href,
  requires: [grants.find((grant) => grant.action === "Update") ?? grants[0]],
  requiresAll: grants,
});

const HOMEPAGE_SCREENS: readonly NavItem[] = [
  homepageScreen("homepageHero", "/homepage/hero", HOMEPAGE_HERO_GRANTS),
  homepageScreen("homepageSponsorStrip", "/homepage/sponsor-strip", HOMEPAGE_SPONSOR_STRIP_GRANTS),
  homepageScreen("homepageSponsors", "/homepage/sponsors", HOMEPAGE_SPONSORS_GRANTS),
  homepageScreen("homepagePartners", "/homepage/partners", HOMEPAGE_PARTNERS_GRANTS),
  homepageScreen("homepageMemberships", "/homepage/memberships", HOMEPAGE_MEMBERSHIPS_GRANTS),
];

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "overview", href: "/", requires: null },
  { key: "users", href: "/users", requires: [{ resourceType: "users" }] },
  // Roles AND permissions. The approved IA (§4.8) defines one screen for
  // both, and the catalogue is a lens on it rather than a second link —
  // "which permissions exist" is not a question anyone opens the platform
  // to answer on its own. `roles:Read` gates the link; a user holding only
  // `permissions:Read` still reaches the screen and sees the catalogue.
  { key: "roles", href: "/roles", requires: [{ resourceType: "roles" }] },
  // The singleton content pages. `newsPage` stands for all twelve: they are
  // twelve separate grants upstream, and someone who holds none of them has
  // nothing to do on that screen — but holding any one of them is enough to
  // need the link, and the screen itself hides the pages they cannot edit.
  { key: "pages", href: "/pages", requires: [{ resourceType: "newsPage" }] },
  /**
   * The president's message — the first link that asks for a specific
   * action rather than any action on a resource.
   *
   * Reading the message is not a reason to open the screen: it exists to
   * change the message, or to decide on a change someone else made. So
   * `presidentMessagePage:Read` alone does not reveal it, and the page
   * itself refuses that reader too (owner decision 2026-09-12) — hiding a
   * link is presentation; refusing the route is the enforcement.
   *
   * Two ways in, because editing and reviewing are different jobs held by
   * different people: the editor writes it, the approver decides on it, and
   * `workflowInstances:Approve` is what the API gates every review decision
   * on.
   */
  {
    key: "presidentMessage",
    href: "/president-message",
    requires: [
      { resourceType: "presidentMessagePage", action: "Update" },
      { resourceType: "workflowInstances", action: "Approve" },
    ],
  },
  /** Vision & Mission, opened by the same two jobs for the same reasons. */
  {
    key: "visionMission",
    href: "/vision-mission",
    requires: [
      { resourceType: "visionMissionPage", action: "Update" },
      { resourceType: "workflowInstances", action: "Approve" },
    ],
  },
  /** The Strategic Plan (ADR-0075), opened by the same two jobs. */
  {
    key: "strategicPlan",
    href: "/strategic-plan",
    requires: [
      { resourceType: "strategicPlansPage", action: "Update" },
      { resourceType: "workflowInstances", action: "Approve" },
    ],
  },
  /**
   * The homepage, with its screens beneath it in the page's own order (owner
   * decision 2026-09-17, ADR-0085).
   *
   * Each screen asks for every grant one Save can use: holding only some would
   * let an editor reach a Save that fails half way. The group is shown when any
   * of its screens is, and links to the first one the reader can open.
   */
  {
    key: "homepage",
    href: "/homepage/hero",
    requires: HOMEPAGE_SCREENS.flatMap((screen) => screen.requires ?? []),
    children: HOMEPAGE_SCREENS,
  },
];

/** Whether these grants satisfy one requirement. */
export const satisfies = (
  grants: readonly PermissionGrant[],
  requirement: NavRequirement,
): boolean => {
  return requirement.action === undefined
    ? canAccessResource(grants, requirement.resourceType)
    : hasPermission(grants, requirement.resourceType, requirement.action);
};

/** Hides what the user cannot open. This is presentation, not enforcement:
 *  typing the URL directly still reaches the screen, and the screen's own
 *  fetch is refused by the API — or, where the screen asks for a specific
 *  action, by the screen's own server-side check. Hiding it just stops the
 *  menu from advertising dead ends. */
const reachable = (grants: readonly PermissionGrant[], item: NavItem): boolean =>
  (item.requires === null || item.requires.some((requirement) => satisfies(grants, requirement))) &&
  (item.requiresAll ?? []).every((requirement) => satisfies(grants, requirement));

export const visibleNavItems = (grants: readonly PermissionGrant[]): NavItem[] =>
  NAV_ITEMS.flatMap((item) => {
    if (!item.children) return reachable(grants, item) ? [item] : [];
    // A group is reached through its screens: shown when one is, pointing at the
    // first, so its link never lands on a screen that refuses the reader.
    const children = item.children.filter((child) => reachable(grants, child));
    return children.length > 0 ? [{ ...item, href: children[0].href, children }] : [];
  });
