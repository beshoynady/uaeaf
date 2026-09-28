import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import { SiteHeader } from "./site-header";
import { HeaderShell } from "./header-shell";
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

/** Renders under an explicit `dir`, since jsdom resolves `direction` from an
 *  ancestor's `dir` attribute through inheritance but applies no stylesheet
 *  of its own — the one thing `getComputedStyle` needs to answer correctly
 *  in a test. */
const renderWithDirection = (ui: React.ReactElement, locale: AppLocale, dir: "ltr" | "rtl") =>
  render(
    <div dir={dir}>
      <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
        {ui}
      </NextIntlClientProvider>
    </div>,
  );

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
    // undeduped, is the expected set — each anchor fragment is a real
    // destination. `.feature-card` is excluded: a panel's promoted card is
    // allowed to repeat a destination its own columns already link (that is
    // the point of promoting it), so it is out of scope for "exactly once".
    const hrefs = [...nav.querySelectorAll("a[href]:not(.feature-card)")].map((a) =>
      a.getAttribute("href"),
    );
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
  it("opens a panel on click and reveals its columns and their links with no second click", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /^About$/ });

    expect(screen.queryByRole("link", { name: "Board of Directors" })).toBeNull();
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // A column is a heading now, not a nested disclosure button — one click
    // on the top-level trigger reaches every link inside it.
    expect(screen.getByRole("heading", { name: "The Federation", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Governance", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Board of Directors" })).toHaveAttribute(
      "href",
      "/en/about/board-members",
    );
    expect(screen.getByRole("link", { name: "Vision & Mission" })).toHaveAttribute(
      "href",
      "/en/about/governance/vision-mission",
    );
  });

  it("closes on Escape from the trigger itself", async () => {
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

  it("closes on Escape from a link inside the panel and returns focus to the trigger", async () => {
    // The weaker version of this test focuses the trigger before pressing
    // Escape, so it cannot fail even if focus-return is deleted entirely —
    // focus never left. The real scenario is a reader deep inside the panel.
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /^About$/ });

    await user.click(trigger);
    const boardMembers = screen.getByRole("link", { name: "Board of Directors" });
    boardMembers.focus();
    expect(boardMembers).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("opens with ArrowDown and lands focus on the first link in the panel", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /^Athletics$/ });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // `requestAnimationFrame` defers the focus move by a frame.
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(screen.getByRole("link", { name: /^Discover Athletics/ })).toHaveFocus();
  });

  it("moves between a panel's items with the arrow keys", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");
    await user.click(screen.getByRole("button", { name: /^Athletics$/ }));

    const clubs = screen.getByRole("link", { name: /^Clubs/ });
    clubs.focus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("link", { name: "Athletes" })).toHaveFocus();

    await user.keyboard("{ArrowUp}");
    expect(clubs).toHaveFocus();
  });

  it("collapses the second disclosure level: a column's links need no click of their own", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "en");

    await user.click(screen.getByRole("button", { name: /^About$/ }));
    // `Governance` used to be its own floating sub-panel behind a second
    // button; it is a plain column heading now.
    expect(screen.queryByRole("button", { name: /^Governance$/ })).toBeNull();
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
    const clubs = screen.getByRole("link", { name: /^Clubs/ });
    expect(clubs).toHaveAttribute("href", "/en/clubs");
    expect(clubs).toHaveTextContent(enMessages.Nav.clubsDescription);
  });

  it("drives panel visibility from the hidden attribute in the stacked (non-row) layout", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const region = () => container.querySelector('[role="region"][aria-label="About"]');

    // jsdom's stubbed `matchMedia` answers every query `false`, which is the
    // server's first-paint answer too — the stacked layout, where a closed
    // panel must be `hidden` rather than merely faded, or it still occupies
    // space and sits in the tab order.
    expect(region()).toHaveAttribute("hidden");

    await user.click(screen.getByRole("button", { name: /^About$/ }));
    expect(region()).not.toHaveAttribute("hidden");
  });
});

describe("SiteHeader current-page state", () => {
  it("marks the current page, and its ancestor group without claiming to be it", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader activePath="/clubs" />, "en");
    await user.click(screen.getByRole("button", { name: /^Athletics$/ }));

    expect(screen.getByRole("link", { name: /Clubs/ })).toHaveAttribute("aria-current", "page");
    // `aria-current="page"` on the ancestor would announce the group as the
    // page the reader is on, which it is not.
    expect(screen.getByRole("button", { name: /^Athletics$/ })).not.toHaveAttribute("aria-current");
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });
});

describe("SiteHeader — indicator state follows active, not hover", () => {
  it("leaves a hovered non-active trigger's indicator at rest while the active trigger's stays on", async () => {
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader activePath="/clubs" />, "en");

    // "Athletics" holds `/clubs` in its panel, so it is the trigger the
    // active indicator belongs to — not the leaf link inside the panel.
    const activeTrigger = screen.getByRole("button", { name: /^Athletics$/ });
    const activeIndicator = activeTrigger.querySelector(".nav-indicator");
    expect(activeIndicator).toHaveAttribute("data-state", "on");

    const nonActiveTrigger = screen.getByRole("button", { name: /^About$/ });
    const nonActiveIndicator = nonActiveTrigger.querySelector(".nav-indicator");
    expect(nonActiveIndicator).toHaveAttribute("data-state", "rest");

    await user.hover(nonActiveTrigger);
    expect(nonActiveIndicator).toHaveAttribute("data-state", "rest");
    expect(activeIndicator).toHaveAttribute("data-state", "on");
  });
});

describe("SiteHeader keyboard — Left/Right follow the reading direction", () => {
  it("ArrowRight moves to the next trigger in LTR", async () => {
    const user = userEvent.setup();
    renderWithDirection(<SiteHeader />, "en", "ltr");
    const about = screen.getByRole("button", { name: /^About$/ });
    const athletics = screen.getByRole("button", { name: /^Athletics$/ });

    about.focus();
    await user.keyboard("{ArrowRight}");
    expect(athletics).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(about).toHaveFocus();
  });

  it("ArrowLeft moves to the visually-next trigger in RTL — not backwards", async () => {
    const user = userEvent.setup();
    renderWithDirection(<SiteHeader />, "ar", "rtl");
    const about = screen.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(arMessages.Nav.about)}`),
    });
    const athletics = screen.getByRole("button", {
      name: new RegExp(`^${escapeRegExp(arMessages.Nav.athletics)}`),
    });

    about.focus();
    await user.keyboard("{ArrowLeft}");
    expect(athletics).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(about).toHaveFocus();
  });

  it("follows an RTL dir under the English locale — direction, not locale, decides", async () => {
    // `en`/`ltr` and `ar`/`rtl` above never disagree, so a hard-coded
    // `locale === "ar"` check would pass both identically. English text under
    // `dir="rtl"` is the one combination that only the DOM's actual
    // `direction` can get right.
    const user = userEvent.setup();
    renderWithDirection(<SiteHeader />, "en", "rtl");
    const about = screen.getByRole("button", { name: /^About$/ });
    const athletics = screen.getByRole("button", { name: /^Athletics$/ });

    about.focus();
    await user.keyboard("{ArrowLeft}");
    expect(athletics).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(about).toHaveFocus();
  });
});

describe("SiteHeader — mega panel backdrop", () => {
  it("renders a second backdrop for the row's mega panels, closed until one opens", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const scrims = container.querySelectorAll(".nav-scrim");
    expect(scrims).toHaveLength(2);
    const panelScrim = scrims[1]!;

    expect(panelScrim).toHaveAttribute("aria-hidden", "true");
    expect(panelScrim).toHaveAttribute("data-open", "false");
    expect(panelScrim.className).toMatch(/pointer-events-none/);

    await user.click(screen.getByRole("button", { name: /^About$/ }));
    expect(panelScrim).toHaveAttribute("data-open", "true");
  });

  it("clicking the panel backdrop closes the open panel", async () => {
    const user = userEvent.setup();
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const trigger = screen.getByRole("button", { name: /^About$/ });

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const panelScrim = container.querySelectorAll(".nav-scrim")[1]!;
    await user.click(panelScrim);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});

describe("SiteHeader — edges and gaps from spacing tokens", () => {
  it("moves the header's side padding onto --space-10 from xl and --grid-margin-xl from 2xl", () => {
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const header = container.querySelector("header")!;
    expect(header.className).toMatch(/xl:px-\[var\(--space-10\)\]/);
    expect(header.className).toMatch(/2xl:px-\[var\(--grid-margin-xl\)\]/);
  });

  it("moves the row's item gap onto --space-6 from xl and --grid-gutter-xl from 2xl", () => {
    const { container } = renderWithIntl(<SiteHeader />, "en");
    const list = container.querySelector("#primary-nav > ul")!;
    expect(list.className).toMatch(/xl:gap-\[var\(--space-6\)\]/);
    expect(list.className).toMatch(/2xl:gap-\[var\(--grid-gutter-xl\)\]/);
  });
});

describe("SiteHeader utilities and drawer", () => {
  it("renders the utility controls (theme, search, language) as real controls", () => {
    renderWithIntl(<SiteHeader />, "ar");
    expect(screen.getByRole("switch", { name: arMessages.Header.darkMode })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: arMessages.Header.search })).toBeInTheDocument();
    const switcher = screen.getByRole("link", {
      name: arMessages.Header.switchLanguageFull.replace(/\{language\}/g, LOCALE_ENDONYM.en),
    });
    expect(switcher).toHaveAttribute("lang", "en");
    expect(switcher).toHaveAttribute("hrefLang", "en");
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

describe("HeaderShell — panel state (brief cases)", () => {
  it("keeps one panel open at any time", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    const about = screen.getByRole("button", { name: /^About/ });
    const athletics = screen.getByRole("button", { name: /^Athletics/ });

    await user.click(about);
    expect(about).toHaveAttribute("aria-expanded", "true");

    await user.click(athletics);
    expect(athletics).toHaveAttribute("aria-expanded", "true");
    expect(about).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape and returns focus to the button", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    const about = screen.getByRole("button", { name: /^About/ });

    await user.click(about);
    await user.keyboard("{Escape}");
    expect(about).toHaveAttribute("aria-expanded", "false");
    expect(about).toHaveFocus();
  });
});

describe("HeaderShell — drawer accordion", () => {
  it("the drawer shows a group's column headings and links, and keeps the club-finder card", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    await user.click(screen.getByRole("button", { name: /Navigation menu/ }));
    await user.click(screen.getByRole("button", { name: /^Athletics/ }));

    expect(screen.getByRole("heading", { name: "Athletics Community", level: 2 })).toBeVisible();
    expect(screen.getByRole("link", { name: /^Clubs/ })).toBeVisible();
    // The one exception the design keeps in the drawer: the Athletics panel's
    // own club-finder call to action, not a promoted article.
    const clubFinder = screen.getByRole("link", { name: /Search Now/ });
    expect(clubFinder).toBeVisible();
    expect(clubFinder).toHaveAttribute("href", "/en/athletics#clubs");
  });

  it("drops the promoted card for every other panel — the column link survives, the card's own CTA does not", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    await user.click(screen.getByRole("button", { name: /Navigation menu/ }));
    await user.click(screen.getByRole("button", { name: /^About/ }));

    // `presidentMessage` (the column link) and `presidentFallbackTitle` (the
    // card's title) render the same words, so asserting the card is gone by
    // that text alone would pass whether or not suppression works. The CTA
    // text belongs to `PresidentFallbackCard` alone, so only it can tell the
    // two apart.
    expect(screen.getByRole("link", { name: "President's Message" })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Read the message/ })).not.toBeInTheDocument();
  });

  it("keeps only one group's content reachable at a time — opening About removes Athletics's card from the tree", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    await user.click(screen.getByRole("button", { name: /Navigation menu/ }));

    await user.click(screen.getByRole("button", { name: /^Athletics/ }));
    expect(screen.getByRole("link", { name: /Search Now/ })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^About/ }));
    expect(screen.queryByRole("link", { name: /Search Now/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Read the message/ })).not.toBeInTheDocument();
  });

  it("leaves the row layout's cards untouched — suppression applies to the drawer only", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" isRow />, "en");
    await user.click(screen.getByRole("button", { name: /^About/ }));
    expect(screen.getByRole("link", { name: /Read the message/ })).toBeVisible();
  });
});

describe("HeaderShell — drawer is a modal", () => {
  it("marks the open drawer as a labelled modal dialog, not the closed one", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    const trigger = screen.getByRole("button", { name: /Navigation menu/ });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger);
    const drawer = screen.getByRole("dialog");
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(drawer).toHaveAccessibleName(enMessages.Header.menu);
  });

  it("keeps Tab cycling inside the drawer across many presses, forward and backward", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    await user.click(screen.getByRole("button", { name: /Navigation menu/ }));

    const drawer = screen.getByRole("dialog");
    const stops = within(drawer).getAllByRole("button");
    // A single stop could not distinguish a trap from an accident; five is
    // the drawer's real top-level disclosure count.
    expect(stops.length).toBeGreaterThan(1);

    stops[0]!.focus();
    // Far more presses than the drawer has stops: a trap that merely
    // redirects the very next Tab proves nothing about the fifth.
    for (let i = 0; i < stops.length * 4; i += 1) {
      await user.tab();
      expect(drawer).toContainElement(document.activeElement as HTMLElement);
    }

    stops[0]!.focus();
    for (let i = 0; i < stops.length * 4; i += 1) {
      await user.tab({ shift: true });
      expect(drawer).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("keeps the trap accurate after an accordion row adds links mid-session", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    await user.click(screen.getByRole("button", { name: /Navigation menu/ }));
    const drawer = screen.getByRole("dialog");

    // Opening a group inserts its column links into the drawer while it is
    // already open — a trap that captured its element list once, at the
    // moment it was set up, would not know these exist.
    await user.click(within(drawer).getByRole("button", { name: /^About/ }));
    const boardMembers = within(drawer).getByRole("link", { name: "Board of Directors" });

    boardMembers.focus();
    for (let i = 0; i < 20; i += 1) {
      await user.tab();
      expect(drawer).toContainElement(document.activeElement as HTMLElement);
    }
  });

  it("closes on Escape and returns focus to the button that opened it", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    const trigger = screen.getByRole("button", { name: /Navigation menu/ });

    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});

describe("HeaderShell — drawer scroll lock", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("locks page scroll while open and restores the value that was there, not blank, on close", async () => {
    const user = userEvent.setup();
    // Simulates another lock (e.g. the future search dialog) already holding
    // the property: releasing this one must not blank someone else's value.
    document.body.style.overflow = "scroll";
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    const trigger = screen.getByRole("button", { name: /Navigation menu/ });

    await user.click(trigger);
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    await user.click(trigger);
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("releases to an empty value when nothing preceded the lock", async () => {
    const user = userEvent.setup();
    renderWithIntl(<HeaderShell features={null} activePath="/" />, "en");
    const trigger = screen.getByRole("button", { name: /Navigation menu/ });

    await user.click(trigger);
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    await user.click(trigger);
    expect(document.body.style.overflow).toBe("");
  });
});

describe("HeaderShell — the row appearing while the drawer is open", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("closes the drawer, releases the scroll lock, and returns focus when isRow flips true", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <HeaderShell features={null} activePath="/" isRow={false} />
      </NextIntlClientProvider>,
    );
    const trigger = screen.getByRole("button", { name: /Navigation menu/ });

    await user.click(trigger);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    rerender(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <HeaderShell features={null} activePath="/" isRow />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Not just "the drawer closed" — the lock itself must be gone, or the
    // page stays unscrollable with the row visible and no cause on screen.
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
  });
});
