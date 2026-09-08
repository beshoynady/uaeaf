import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteHeader } from "./site-header";
import { PRIMARY_NAV } from "@/lib/navigation";
import { renderWithIntl } from "@/test/render-with-intl";
import type { AppLocale } from "@/i18n/routing";
import arMessages from "../../../messages/ar.json";
import enMessages from "../../../messages/en.json";

const messagesByLocale = { ar: arMessages, en: enMessages } as const;

describe.each<AppLocale>(["ar", "en"])("SiteHeader (%s)", (locale) => {
  const messages = messagesByLocale[locale];
  const localePath = (href: string) => `/${locale}${href === "/" ? "" : href}`;

  it("renders a banner landmark containing the primary navigation", () => {
    renderWithIntl(<SiteHeader />, locale);
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("navigation", { name: messages.Header.mainNav })).toBeInTheDocument();
  });

  it("renders all nine approved primary nav items as translated links", () => {
    renderWithIntl(<SiteHeader />, locale);
    const nav = screen.getByRole("navigation", { name: messages.Header.mainNav });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(9);
    for (const item of PRIMARY_NAV) {
      const label = messages.Nav[item.key as keyof typeof messages.Nav];
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", localePath(item.href));
    }
  });

  it("marks the active route with aria-current, not colour alone", () => {
    renderWithIntl(<SiteHeader activePath="/" />, locale);
    const active = screen.getByRole("link", { name: messages.Nav.home });
    expect(active).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: messages.Nav.clubs })).not.toHaveAttribute("aria-current");
  });

  /**
   * The five dropdown items render their chevron as a decorative hint only.
   * Flyout panels (Figma 169:1479 / 169:1492) are a separate increment; until
   * they exist, advertising `aria-haspopup="menu"` would promise assistive-tech
   * users a menu that never opens. Each item stays a plain, keyboard-reachable
   * link to its own landing page.
   */
  it("renders dropdown chevrons as decoration, without promising an unbuilt menu", () => {
    const { container } = renderWithIntl(<SiteHeader />, locale);
    const chevrons = container.querySelectorAll('[data-chevron="true"]');
    expect(chevrons).toHaveLength(5);
    for (const chevron of chevrons) {
      expect(chevron).toHaveAttribute("aria-hidden", "true");
    }
    expect(container.querySelectorAll("[aria-haspopup]")).toHaveLength(0);
  });

  it("renders the logo as a home link with an accessible name", () => {
    renderWithIntl(<SiteHeader />, locale);
    const logo = screen.getByRole("link", { name: messages.Header.homeAriaLabel });
    expect(logo).toHaveAttribute("href", localePath("/"));
  });

  it("renders the utility controls (theme, search, language) as real controls", () => {
    renderWithIntl(<SiteHeader />, locale);
    // Default (no data-theme set yet): announces the action, switch to dark.
    expect(screen.getByRole("button", { name: messages.Header.switchToDarkMode })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: messages.Header.search })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: messages.Header.switchLanguage })).toBeInTheDocument();
  });

  it("provides a skip link to the main content as the first focusable element", () => {
    renderWithIntl(<SiteHeader />, locale);
    const skip = screen.getByRole("link", { name: messages.Header.skipLink });
    expect(skip).toHaveAttribute("href", "#main-content");
  });
});

describe("SiteHeader language toggle", () => {
  it("points to the other locale's version of the current page", () => {
    renderWithIntl(<SiteHeader />, "ar");
    const toggle = screen.getByRole("link", { name: arMessages.Header.switchLanguage });
    expect(toggle).toHaveAttribute("href", expect.stringContaining("/en"));
  });
});

/**
 * Below the row's own width the header had no navigation at all — the nav was
 * `hidden lg:block` and nothing replaced it. IA §8.1 specifies a drawer with
 * the same tree, and PR-006 makes the public layer mobile-priority, so the
 * range that was missing was the one that matters most.
 *
 * The threshold is `xl`, not `lg`: measured in a real browser, the nine
 * approved labels need 1066px of intrinsic width and overflowed a 1024px
 * viewport by 360px. See the component's own note.
 */
describe("SiteHeader navigation below the row breakpoint", () => {
  it("keeps one list, not a second copy for small screens", async () => {
    renderWithIntl(<SiteHeader />, "ar");
    // Two lists would double the tab order and announce every destination
    // twice. The count is nine whether the panel is open or closed.
    expect(screen.getAllByRole("link", { name: arMessages.Nav.clubs })).toHaveLength(1);
  });

  it("exposes the panel through a labelled button that reports its state", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "ar");

    const toggle = screen.getByRole("button", { name: arMessages.Header.menu });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(toggle).toHaveAttribute("aria-controls", "primary-nav");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  it("takes the collapsed panel out of the tab order rather than hiding it visually", () => {
    // `hidden` removes the links from the accessibility tree and from tab
    // order. A panel that is merely off-screen leaves nine focus stops that
    // go nowhere a keyboard user can see.
    const { container } = renderWithIntl(<SiteHeader />, "ar");
    expect(container.querySelector("#primary-nav")?.className).toMatch(/(?:^|\s)hidden(?:\s|$)/);
  });

  it("closes the panel when a destination is chosen", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    renderWithIntl(<SiteHeader />, "ar");

    const toggle = screen.getByRole("button", { name: arMessages.Header.menu });
    await user.click(toggle);
    await user.click(screen.getByRole("link", { name: arMessages.Nav.clubs }));

    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("gives the toggle a 44px touch target", () => {
    // IA §12 states this as a KPI for every small screen, and this control
    // exists only on small screens.
    const toggle = renderWithIntl(<SiteHeader />, "ar").container.querySelector(
      '[aria-controls="primary-nav"]',
    );
    expect(toggle?.className).toMatch(/(?:^|\s)size-11(?:\s|$)/);
  });
});
