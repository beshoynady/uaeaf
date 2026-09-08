import { describe, expect, it } from "vitest";
import { NAV_ITEMS, visibleNavItems } from "./navigation";
import { UNCLASSIFIED_DOMAIN_KEY, domainKeyFor } from "./admin/resource-domains";
import { STATIC_PAGES } from "./admin/static-pages";

describe("visibleNavItems", () => {
  it("offers no separate permissions destination", () => {
    // The approved IA (01-Information-Architecture.md §4.8) defines ONE
    // screen, "Roles & Permissions", under Users & Access. The catalogue
    // lives on it as a lens, not as a second link: a read-only list of what
    // permissions exist is not a task anyone opens the platform to perform.
    expect(NAV_ITEMS.some((item) => item.resourceType === "permissions")).toBe(false);
    expect(NAV_ITEMS.some((item) => item.href === "/permissions")).toBe(false);
  });

  it("always keeps the overview, even for a user with no permissions at all", () => {
    // A freshly created account with no role assigned must still land
    // somewhere that explains its own emptiness, not on a blank shell.
    expect(visibleNavItems([]).map((item) => item.key)).toEqual(["overview"]);
  });

  it("reveals a section as soon as the user holds any action on its resource", () => {
    const grants = [{ resourceType: "roles", action: "Read" }];

    expect(visibleNavItems(grants).map((item) => item.key)).toEqual(["overview", "roles"]);
  });

  it("shows everything to a fully privileged user, in the declared order", () => {
    const grants = NAV_ITEMS.filter((item) => item.resourceType !== null).map((item) => ({
      resourceType: item.resourceType as string,
      action: "Read",
    }));

    expect(visibleNavItems(grants)).toEqual(NAV_ITEMS);
  });

  it("names resources that the API actually gates on", () => {
    // Guards against a typo'd resourceType here silently hiding a section
    // forever. Checked against the resource map rather than a copy of the
    // list, so adding a section cannot be "fixed" by editing the expected
    // value — a name that is not a real API resource fails.
    const named = NAV_ITEMS.map((item) => item.resourceType).filter(
      (resource): resource is string => resource !== null,
    );

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
    expect(STATIC_PAGES.map((page) => page.resourceType)).toContain(pages?.resourceType);
  });
});
