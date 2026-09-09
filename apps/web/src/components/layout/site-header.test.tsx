import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./site-header";
import { PRIMARY_NAV, navDestinations } from "@/lib/navigation";
import { renderWithIntl } from "@/test/render-with-intl";
import { LOCALE_ENDONYM, type AppLocale } from "@/i18n/routing";
import arMessages from "../../../messages/ar.json";
import enMessages from "../../../messages/en.json";

const messagesByLocale = { ar: arMessages, en: enMessages } as const;

const groups = PRIMARY_NAV.filter((item) => item.children);
const topLevelLinks = PRIMARY_NAV.filter((item) => !item.children);

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe.each<AppLocale>(["ar", "en"])("SiteHeader (%s)", (locale) => {
  const messages = messagesByLocale[locale];
  const label = (key: string) => messages.Nav[key as keyof typeof messages.Nav];
  const localePath = (href: string) => `/${locale}${href === "/" ? "" : href}`;

  it("renders a banner containing the labelled main navigation", () => {
    renderWithIntl(<SiteHeader />, locale);
    const banner = screen.getByRole("banner");
    expect(
      within(banner).getByRole("navigation", { name: messages.Header.mainNav }),
    ).toBeInTheDocument();
  });

  it("renders each grouping item as a collapsed disclosure button, not a link", () => {
    renderWithIntl(<SiteHeader />, locale);
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      const trigger = screen.getByRole("button", {
        name: new RegExp(escapeRegExp(label(group.key))),
      });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      expect(trigger).toHaveAttribute("aria-controls");
      // A control that both navigates and discloses can do neither
      // unambiguously from the keyboard, so a group is never also a link.
      expect(screen.queryByRole("link", { name: label(group.key) })).toBeNull();
    }
  });

  it("renders each top-level destination as a real link to its own route", () => {
    renderWithIntl(<SiteHeader />, locale);
    expect(topLevelLinks).toHaveLength(5);
    for (const item of topLevelLinks) {
      expect(screen.getByRole("link", { name: label(item.key) })).toHaveAttribute(
        "href",
        localePath(item.href!),
      );
    }
  });

  it("carries every destination exactly once, so the tab order is not doubled", () => {
    const { container } = renderWithIntl(<SiteHeader />, locale);
    const nav = container.querySelector("#primary-nav") as HTMLElement;
    // Read from the DOM rather than by role: a closed panel's links are
    // correctly absent from the accessibility tree, and what this rule is
    // about is that no destination exists TWICE in the markup.
    const hrefs = [...nav.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    const expected = navDestinations().map((leaf) => localePath(leaf.href));
    expect([...hrefs].sort()).toEqual([...expected].sort());
  });

  it("uses the disclosure pattern, never an application menu", () => {
    const { container } = renderWithIntl(<SiteHeader />, locale);
    // `role="menu"` / `menuitem` would strip these of their link semantics: a
    // screen reader stops counting them as links, drops them from its links
    // list, and announces "menu item" for something that navigates.
    expect(
      container.querySelectorAll('[role="menu"], [role="menuitem"], [role="menubar"]'),
    ).toHaveLength(0);
  });
});

describe("SiteHeader disclosure behaviour", () => {
  it("opens a panel on click and reveals its children", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /About the Federation/ });

    expect(screen.queryByRole("link", { name: "Board of Directors" })).toBeNull();
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Board of Directors" })).toHaveAttribute(
      "href",
      "/en/about/board-members",
    );
  });

  it("closes on Escape and returns focus to the trigger it came from", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /About the Federation/ });

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    trigger.focus();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("opens with ArrowDown and lands focus on the first child", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /^Members/ });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // `requestAnimationFrame` defers the focus move by a frame.
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(screen.getByRole("link", { name: /Clubs/ })).toHaveFocus();
  });

  it("moves between a panel's items with the arrow keys", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    await user.click(screen.getByRole("button", { name: /^Members/ }));

    const clubs = screen.getByRole("link", { name: /Clubs/ });
    clubs.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: "Athletes" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(clubs).toHaveFocus();
  });

  it("carries the nested group one level deeper without flattening it", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");

    await user.click(screen.getByRole("button", { name: /About the Federation/ }));
    const nested = screen.getByRole("button", { name: /Governance & Strategy/ });
    expect(nested).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Strategic Plan" })).toBeNull();

    await user.click(nested);
    expect(nested).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Vision & Mission" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Policies & Regulations" })).toBeInTheDocument();
  });

  it("opens only one panel at a time", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const about = screen.getByRole("button", { name: /About the Federation/ });
    const members = screen.getByRole("button", { name: /^Members/ });

    await user.click(about);
    await user.click(members);

    expect(about).toHaveAttribute("aria-expanded", "false");
    expect(members).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the meaning Clubs lost when it stopped being top-level", () => {
    renderWithIntl(<SiteHeader />, "en");
    // IA §8.1 kept Clubs at top level because it *is* the General Assembly
    // membership listing. Moving it under Members must not drop that.
    expect(screen.getByText(enMessages.Nav.clubsDescription)).toBeInTheDocument();
  });
});

describe("SiteHeader current-page state", () => {
  it("marks the current page, and its ancestor group without claiming to be it", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader activePath="/clubs" />, "en");
    await user.click(screen.getByRole("button", { name: /^Members/ }));

    expect(screen.getByRole("link", { name: /Clubs/ })).toHaveAttribute("aria-current", "page");
    // `aria-current="page"` on the ancestor would announce the group as the
    // page the reader is on, which it is not.
    expect(screen.getByRole("button", { name: /^Members/ })).not.toHaveAttribute("aria-current");
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});

describe("SiteHeader utilities and drawer", () => {
  it("renders the utility controls (theme, search, language) as real controls", () => {
    renderWithIntl(<SiteHeader />, "ar");
    expect(
      screen.getByRole("button", { name: arMessages.Header.switchToDarkMode }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: arMessages.Header.search })).toBeInTheDocument();
    const switcher = screen.getByRole("link", {
      name: arMessages.Header.switchLanguage.replace("{language}", LOCALE_ENDONYM.en),
    });
    expect(within(switcher).getByText(LOCALE_ENDONYM.en)).toHaveAttribute("lang", "en");
  });

  it("provides a skip link to the main content", () => {
    renderWithIntl(<SiteHeader />, "en");
    expect(screen.getByRole("link", { name: enMessages.Header.skipLink })).toHaveAttribute(
      "href",
      "#main-content",
    );
  });

  it("toggles the drawer and keeps its links out of the tab order while closed", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const toggle = screen.getByRole("button", { name: enMessages.Header.menu });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "primary-nav");
    // The `hidden` attribute, not merely a class: it removes the links from
    // the accessibility tree and the tab order without depending on a
    // stylesheet, rather than leaving them reachable behind a closed panel.
    expect(container.querySelector("#primary-nav")?.className).toMatch(/(?:^|\s)hidden(?:\s|$)/);

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(container.querySelector("#primary-nav")?.className).toMatch(/(?:^|\s)block(?:\s|$)/);
  });

  it("closes the drawer on Escape", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const toggle = screen.getByRole("button", { name: enMessages.Header.menu });

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    toggle.focus();
    await user.keyboard("{Escape}");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("gives the drawer trigger a 44px target", () => {
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const toggle = container.querySelector('button[aria-controls="primary-nav"]');
    expect(toggle?.className).toMatch(/(?:^|\s)size-11(?:\s|$)/);
  });

  it("dims the page behind the drawer without adding a control to reach past it", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const scrim = container.querySelector(".nav-scrim")!;

    expect(scrim).toHaveAttribute("aria-hidden", "true");
    expect(scrim).toHaveAttribute("data-open", "false");
    expect(scrim.className).toMatch(/pointer-events-none/);

    await user.click(screen.getByRole("button", { name: enMessages.Header.menu }));
    expect(scrim).toHaveAttribute("data-open", "true");
  });
});
