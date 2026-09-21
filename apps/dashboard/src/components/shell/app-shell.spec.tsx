import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import arabic from "../../../messages/ar.json";
import { renderWithIntl } from "@/test/render";
import type { NavItem } from "@/lib/navigation";
import { AppShell } from "./app-shell";

const { Shell, Nav } = arabic;

const items: NavItem[] = [
  { key: "overview", href: "/", requires: null },
  { key: "users", href: "/users", requires: null },
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
    href: "/approval-policies",
    requires: null,
    children: [{ key: "approvalPolicies", href: "/approval-policies", requires: null }],
  },
];

const renderShell = (initialCollapsed = false, initialGroups: Record<string, boolean> = {}) =>
  renderWithIntl(
    <AppShell
      items={items}
      initialCollapsed={initialCollapsed}
      initialGroups={initialGroups}
      brand={<span>brand</span>}
      identity={<span>identity</span>}
      controls={<span>controls</span>}
    >
      <h1>page</h1>
    </AppShell>,
  );

const sidebar = () => document.querySelector("aside") as HTMLElement;

afterEach(() => {
  document.cookie = "uaeaf_admin_sidebar=; max-age=0; path=/";
});

describe("AppShell", () => {
  it("draws the width the administrator chose from the very first render", () => {
    // Read from the cookie on the server and passed in, so there is no
    // render at the default width followed by a jump to the stored one.
    renderShell(true);

    expect(sidebar()).toHaveAttribute("data-collapsed", "true");
    expect(screen.getByRole("button", { name: Shell.expandSidebar })).toHaveAttribute("aria-expanded", "false");
  });

  it("collapses the sidebar and remembers it for the next page", async () => {
    renderShell(false);

    const toggle = screen.getByRole("button", { name: Shell.collapseSidebar });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", sidebar().id);

    await userEvent.click(toggle);

    expect(sidebar()).toHaveAttribute("data-collapsed", "true");
    expect(screen.getByRole("button", { name: Shell.expandSidebar })).toHaveAttribute("aria-expanded", "false");
    expect(document.cookie).toContain("uaeaf_admin_sidebar=collapsed");
  });

  it("keeps every link named while only its icon is drawn", () => {
    // Collapsed, the label is visually hidden but stays the link's text, so a
    // screen reader still hears "Users" rather than an unnamed link.
    renderShell(true);

    const nav = within(sidebar());
    expect(nav.getByRole("link", { name: Nav.users })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: Nav.approvalPolicies })).toBeInTheDocument();
  });

  it("marks the page the reader is on", () => {
    renderShell(false);

    expect(within(sidebar()).getByRole("link", { name: Nav.overview })).toHaveAttribute("aria-current", "page");
  });

  it("draws the icons out of the accessibility tree", () => {
    renderShell(false);

    const icons = sidebar().querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => expect(icon).toHaveAttribute("aria-hidden", "true"));
  });

  describe("below lg, where the sidebar is a drawer", () => {
    const drawer = () => document.querySelector("dialog[data-drawer]") as HTMLDialogElement;

    it("opens the navigation behind the menu button", async () => {
      renderShell(false);

      const button = screen.getByRole("button", { name: Shell.openNavigation });
      expect(button).toHaveAttribute("aria-haspopup", "dialog");
      expect(button).toHaveAttribute("aria-expanded", "false");

      await userEvent.click(button);

      expect(drawer().open).toBe(true);
      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(within(drawer()).getByRole("link", { name: Nav.users })).toBeInTheDocument();
    });

    it("closes on Escape", async () => {
      renderShell(false);
      await userEvent.click(screen.getByRole("button", { name: Shell.openNavigation }));

      await userEvent.keyboard("{Escape}");

      expect(drawer().open).toBe(false);
    });

    it("closes from its own close button", async () => {
      renderShell(false);
      await userEvent.click(screen.getByRole("button", { name: Shell.openNavigation }));

      await userEvent.click(within(drawer()).getByRole("button", { name: Shell.closeNavigation }));

      expect(drawer().open).toBe(false);
    });

    it("opens again after the browser closed it on its own", async () => {
      renderShell(false);
      const button = screen.getByRole("button", { name: Shell.openNavigation });
      await userEvent.click(button);

      act(() => drawer().close());
      expect(button).toHaveAttribute("aria-expanded", "false");

      await userEvent.click(button);
      expect(drawer().open).toBe(true);
    });

    it("closes once a screen is chosen, so the page arrives uncovered", async () => {
      renderShell(false);
      await userEvent.click(screen.getByRole("button", { name: Shell.openNavigation }));

      await userEvent.click(within(drawer()).getByRole("link", { name: Nav.users }));

      expect(drawer().open).toBe(false);
    });
  });

  it("folds groups in the sidebar, from the stored choices, and never in the drawer", () => {
    // ADR-0090 D1: the drawer shows every screen with its full name.
    renderShell(false, { news: true });

    const inSidebar = within(sidebar()).getByRole("button", { name: new RegExp(`^${Nav.news}`) });
    expect(inSidebar).toHaveAttribute("aria-expanded", "true");
    const drawer = document.querySelector("dialog[data-drawer]") as HTMLElement;
    expect(within(drawer).queryByRole("button", { name: new RegExp(`^${Nav.news}`), hidden: true })).toBeNull();
  });

  it("keeps the page itself in the main landmark the skip link points at", () => {
    renderShell(false);

    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(within(screen.getByRole("main")).getByRole("heading", { name: "page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: Shell.skipLink })).toHaveAttribute("href", "#main-content");
  });
});
