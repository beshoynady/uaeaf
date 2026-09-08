import { canAccessResource, type PermissionGrant } from "./auth/permissions";

/**
 * The dashboard's navigation model, held as data so "what a user can reach"
 * is one testable list rather than a permission check scattered across JSX.
 *
 * `resourceType` names the API resource the screen reads. It is the same
 * string `@RequirePermission` uses on the controller, which is what keeps
 * the menu honest: a link only appears when the API would actually answer.
 */
export interface NavItem {
  /** Key into the `Nav` message namespace. */
  key: string;
  href: string;
  /** `null` for screens every authenticated user may open. */
  resourceType: string | null;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "overview", href: "/", resourceType: null },
  { key: "users", href: "/users", resourceType: "users" },
  // Roles AND permissions. The approved IA (§4.8) defines one screen for
  // both, and the catalogue is a lens on it rather than a second link —
  // "which permissions exist" is not a question anyone opens the platform
  // to answer on its own. `roles:Read` gates the link; a user holding only
  // `permissions:Read` still reaches the screen and sees the catalogue.
  { key: "roles", href: "/roles", resourceType: "roles" },
  // The singleton content pages. `newsPage` stands for all twelve: they are
  // twelve separate grants upstream, and someone who holds none of them has
  // nothing to do on that screen — but holding any one of them is enough to
  // need the link, and the screen itself hides the pages they cannot edit.
  { key: "pages", href: "/pages", resourceType: "newsPage" },
];

/** Hides what the user cannot open. This is presentation, not enforcement:
 *  typing the URL directly still reaches the screen, and the screen's own
 *  fetch is refused by the API. Hiding it just stops the menu from
 *  advertising dead ends. */
export function visibleNavItems(grants: readonly PermissionGrant[]): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => item.resourceType === null || canAccessResource(grants, item.resourceType),
  );
}
