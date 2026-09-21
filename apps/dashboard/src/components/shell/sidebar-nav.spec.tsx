import type { AnchorHTMLAttributes, ReactNode } from "react";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import arabic from "../../../messages/ar.json";
import { renderWithIntl } from "@/test/render";
import type { NavItem } from "@/lib/navigation";
import { SidebarNav } from "./sidebar-nav";

const { Nav, Shell } = arabic;

// The page the reader is on, set per test.
let pathname = "/approval-policies";
vi.mock("@/i18n/navigation", () => ({
  usePathname: () => pathname,
  Link: ({ href, children, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode }) => (
    <a href={String(href)} {...rest}>
      {children}
    </a>
  ),
}));

const items: NavItem[] = [
  { key: "overview", href: "/", requires: null },
  {
    key: "news",
    href: "/news",
    requires: null,
    children: [
      { key: "newsList", href: "/news", requires: null },
      { key: "newsReview", href: "/news/review", requires: null },
    ],
  },
  {
    key: "usersAccess",
    href: "/users",
    requires: null,
    children: [
      { key: "users", href: "/users", requires: null },
      { key: "approvalPolicies", href: "/approval-policies", requires: null },
    ],
  },
  {
    key: "homepage",
    href: "/homepage/hero",
    requires: null,
    children: [
      { key: "homepageHero", href: "/homepage/hero", requires: null },
      { key: "homepageSponsors", href: "/homepage/sponsors", requires: null },
    ],
  },
];

/** The sidebar at lg+, expanded: the one place groups fold (ADR-0090 D1). */
const renderSidebar = (initialGroups: Record<string, boolean> = {}) =>
  renderWithIntl(
    <aside data-collapsed="false">
      <SidebarNav items={items} foldGroups initialGroups={initialGroups} />
    </aside>,
  );

const group = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
const listOf = (button: HTMLElement) => document.getElementById(button.getAttribute("aria-controls") ?? "") as HTMLElement;

afterEach(() => {
  pathname = "/approval-policies";
  document.cookie = "uaeaf_admin_nav_groups=; max-age=0; path=/";
});

describe("SidebarNav groups (ADR-0090)", () => {
  it("opens the group that holds the current screen and closes the others", () => {
    renderSidebar();

    expect(group(Nav.usersAccess)).toHaveAttribute("aria-expanded", "true");
    expect(group(Nav.news)).toHaveAttribute("aria-expanded", "false");
    expect(group(Nav.homepage)).toHaveAttribute("aria-expanded", "false");
  });

  it("points each group's button at the list it shows or hides", () => {
    renderSidebar();

    const list = listOf(group(Nav.homepage));
    expect(list.tagName).toBe("UL");
    expect(list).toHaveAttribute("data-open", "false");
    expect(within(list).getByRole("link", { name: Nav.homepageHero, hidden: true })).toBeInTheDocument();
  });

  it("is a button and never also a link (ADR-0062 D3)", () => {
    renderSidebar();

    expect(screen.queryByRole("link", { name: Nav.news })).not.toBeInTheDocument();
    expect(group(Nav.news).tagName).toBe("BUTTON");
  });

  it("folds and unfolds a group, and remembers the choice", async () => {
    renderSidebar();

    await userEvent.click(group(Nav.homepage));

    expect(group(Nav.homepage)).toHaveAttribute("aria-expanded", "true");
    expect(listOf(group(Nav.homepage))).toHaveAttribute("data-open", "true");
    expect(document.cookie).toContain("uaeaf_admin_nav_groups=homepage:1");
  });

  it("keeps a stored choice over the default, on the current group too", () => {
    renderSidebar({ usersAccess: false });

    expect(group(Nav.usersAccess)).toHaveAttribute("aria-expanded", "false");
  });

  it("says a closed group holds the current screen, in words as well as a mark", () => {
    renderSidebar({ usersAccess: false });

    expect(group(Nav.usersAccess)).toHaveAccessibleName(`${Nav.usersAccess} ${Shell.groupHasCurrent}`);
  });

  it("says nothing extra on a group that is open or does not hold the current screen", () => {
    renderSidebar();

    expect(group(Nav.usersAccess)).toHaveAccessibleName(Nav.usersAccess);
    expect(group(Nav.news)).toHaveAccessibleName(Nav.news);
  });

  it("follows the reader to another group when nothing is stored", () => {
    pathname = "/homepage/sponsors";
    renderSidebar();

    expect(group(Nav.homepage)).toHaveAttribute("aria-expanded", "true");
    expect(group(Nav.usersAccess)).toHaveAttribute("aria-expanded", "false");
  });

  it("draws no fold where groups stay flat: the drawer, the rail and the collapsed sidebar", () => {
    // Without `foldGroups` the same list renders every group open, its name
    // as text — the drawer's case. The rail and the collapsed sidebar are the
    // aside's own CSS over this same markup, checked in a real browser.
    renderWithIntl(<SidebarNav items={items} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: Nav.homepageHero })).toBeInTheDocument();
  });
});
