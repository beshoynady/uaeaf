import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./site-header";
import { PRIMARY_NAV, type NavItem } from "@/lib/navigation";
import { renderWithIntl } from "@/test/render-with-intl";
import { LOCALE_ENDONYM, type AppLocale } from "@/i18n/routing";
import arMessages from "../../../messages/ar.json";
import enMessages from "../../../messages/en.json";

const messagesByLocale = { ar: arMessages, en: enMessages } as const;

const groups = PRIMARY_NAV.filter((item) => item.children);
const topLevelLinks = PRIMARY_NAV.filter((item) => !item.children);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Every leaf `href` in the tree, undeduped — unlike `navDestinations()`,
 *  which folds an anchor into its page for the footer's use. */
const leafHrefs = (items: readonly NavItem[]): string[] =>
  items.flatMap((item) => (item.children ? leafHrefs(item.children) : [item.href!]));

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
    expect(groups).toHaveLength(5);
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
    expect(topLevelLinks).toHaveLength(1);
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
    // Read from the DOM, not the accessibility tree, since a closed panel's
    // links are absent from screen-reader queries; `PRIMARY_NAV` itself,
    // undeduped, is the expected set — each anchor fragment is a real destination.
    const hrefs = [...nav.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
    expect(new Set(hrefs).size).toBe(hrefs.length);
    const expected = leafHrefs(PRIMARY_NAV).map((href) => localePath(href));
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
    const trigger = screen.getByRole("button", { name: /^About$/ });

    expect(screen.queryByRole("link", { name: "Board of Directors" })).toBeNull();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // "Board of Directors" sits one column deeper, under "The Federation".
    await user.click(screen.getByRole("button", { name: /^The Federation$/ }));
    expect(screen.getByRole("link", { name: "Board of Directors" })).toHaveAttribute(
      "href",
      "/en/about/board-members",
    );
  });

  it("closes on Escape and returns focus to the trigger it came from", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /^About$/ });

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
    const trigger = screen.getByRole("button", { name: /^Athletics$/ });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // `requestAnimationFrame` defers the focus move by a frame.
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(screen.getByRole("button", { name: /Discover the Sport/ })).toHaveFocus();
  });

  it("moves between a panel's items with the arrow keys", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    await user.click(screen.getByRole("button", { name: /^Athletics$/ }));
    await user.click(screen.getByRole("button", { name: /Athletics Community/ }));

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

    await user.click(screen.getByRole("button", { name: /^About$/ }));
    const nested = screen.getByRole("button", { name: /^Governance$/ });
    expect(nested).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Strategic Plan" })).toBeNull();

    await user.click(nested);
    expect(nested).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Vision & Mission" })).toBeInTheDocument();
    // `policies` carries `policiesDescription`, so its accessible name is the
    // label plus the caption text, not the label alone.
    expect(screen.getByRole("link", { name: /^Regulations & Policies/ })).toBeInTheDocument();
  });

  it("opens only one panel at a time", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const about = screen.getByRole("button", { name: /^About$/ });
    const athletics = screen.getByRole("button", { name: /^Athletics$/ });

    await user.click(about);
    await user.click(athletics);

    expect(about).toHaveAttribute("aria-expanded", "false");
    expect(athletics).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the meaning Clubs lost when it stopped being a top-level item", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    // "Clubs IS the General Assembly membership listing" is why IA §8.1 gave it
    // top level; carried on the description since it moved inside a panel
    // (ADR-0062).
    await user.click(screen.getByRole("button", { name: /^Athletics$/ }));
    await user.click(screen.getByRole("button", { name: /Athletics Community/ }));
    const clubs = screen.getByRole("link", { name: /^Clubs/ });
    expect(clubs).toHaveAttribute("href", "/en/clubs");
    expect(clubs).toHaveTextContent(enMessages.Nav.clubsDescription);
  });
});

describe("SiteHeader current-page state", () => {
  it("marks the current page, and its ancestor group without claiming to be it", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader activePath="/clubs" />, "en");
    await user.click(screen.getByRole("button", { name: /^Athletics$/ }));
    await user.click(screen.getByRole("button", { name: /Athletics Community/ }));

    expect(screen.getByRole("link", { name: /Clubs/ })).toHaveAttribute("aria-current", "page");
    // `aria-current="page"` on the ancestor would announce the group as the
    // page the reader is on, which it is not.
    expect(screen.getByRole("button", { name: /^Athletics$/ })).not.toHaveAttribute("aria-current");
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
