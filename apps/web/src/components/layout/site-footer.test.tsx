import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./site-footer";
import { FOOTER_QUICK_LINKS, LEGAL_LINKS, SOCIAL_LINKS } from "@/lib/navigation";
import { renderWithIntl } from "@/test/render-with-intl";
import type { AppLocale } from "@/i18n/routing";
import arMessages from "../../../messages/ar.json";
import enMessages from "../../../messages/en.json";

const messagesByLocale = { ar: arMessages, en: enMessages } as const;

describe.each<AppLocale>(["ar", "en"])("SiteFooter (%s)", (locale) => {
  const messages = messagesByLocale[locale];
  const localePath = (href: string) => `/${locale}${href === "/" ? "" : href}`;

  it("renders a contentinfo landmark", () => {
    renderWithIntl(<SiteFooter />, locale);
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
  });

  it("renders every approved quick link, translated, inside a labelled navigation landmark", () => {
    renderWithIntl(<SiteFooter />, locale);
    const nav = screen.getByRole("navigation", { name: messages.Footer.quickLinksNav });
    const links = within(nav).getAllByRole("link");
    expect(links).toHaveLength(FOOTER_QUICK_LINKS.length);
    for (const item of FOOTER_QUICK_LINKS) {
      const label = messages.Nav[item.key as keyof typeof messages.Nav];
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute("href", localePath(item.href));
    }
  });

  it("renders the legal strip links, translated, inside their own labelled landmark", () => {
    renderWithIntl(<SiteFooter />, locale);
    const nav = screen.getByRole("navigation", { name: messages.Footer.legalNav });
    expect(within(nav).getAllByRole("link")).toHaveLength(LEGAL_LINKS.length);
  });

  it("gives every social icon a translated accessible name and opens it safely", () => {
    renderWithIntl(<SiteFooter />, locale);
    for (const social of SOCIAL_LINKS) {
      const label = messages.Social[social.key as keyof typeof messages.Social];
      const link = screen.getByRole("link", { name: label });
      expect(link).toHaveAttribute("href", social.href);
      expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
    }
  });

  it("exposes contact details as actionable links, not plain text", () => {
    renderWithIntl(<SiteFooter />, locale);
    expect(screen.getByRole("link", { name: "info@uaeaf.ae" })).toHaveAttribute(
      "href",
      "mailto:info@uaeaf.ae",
    );
  });

  it("hides purely decorative brand swooshes from assistive tech", () => {
    const { container } = renderWithIntl(<SiteFooter />, locale);
    const decorations = container.querySelectorAll('[data-decorative="true"]');
    expect(decorations).toHaveLength(4);
    for (const node of decorations) {
      expect(node).toHaveAttribute("aria-hidden", "true");
    }
  });

  it("renders the translated copyright notice", () => {
    renderWithIntl(<SiteFooter />, locale);
    expect(screen.getByText(messages.Footer.copyright)).toBeInTheDocument();
  });
});

/**
 * Regression net for the wrap-balloon bug (audit report Part 9.2 /
 * CLAUDE.md §1a): below `xl` (1280px, matching Design System §5.2's own `xl`
 * breakpoint start) the four-column row has no real Design-System-derived
 * layout at all, so a lone wrapped flex-grow column balloons to full row
 * width. jsdom has no layout engine, so these assertions can only check the
 * *contract* (grid classes present per §5.2-derived breakpoint, the old
 * flex-grow/wrap combination gone, previously-fixed-width children now
 * fluid) — the actual defect fix is confirmed visually in the audit report,
 * not by this suite.
 */
describe("SiteFooter responsive layout (Chapter 5-derived breakpoints)", () => {
  it("lays the four-column row out as a Design-System-grid, not an unconstrained wrapping flex row", () => {
    const { container } = renderWithIntl(<SiteFooter />, "ar");
    const row = container.querySelector('[data-testid="footer-columns"]');
    expect(row).not.toBeNull();
    const className = row!.className;

    // §5.2 xs/sm (≤767px): single column, full stack (§5.10 Stacking).
    expect(className).toMatch(/(?:^|\s)grid-cols-1(?:\s|$)/);
    // §5.2 md (768-1023px, 8 cols / 24px gutter): 8÷4 sections = 2 per row.
    expect(className).toMatch(/(?:^|\s)md:grid-cols-2(?:\s|$)/);
    // §5.2 lg (1024-1279px, 12 cols / 24px gutter): 12÷4 = 3 tracks each, fractional not fixed-px.
    expect(className).toMatch(/(?:^|\s)lg:grid-cols-4(?:\s|$)/);
    // §5.2 xl/2xl (≥1280px): stays a grid (not flex) so it degrades gracefully
    // instead of overflowing; only the gap widens to the already-approved 48px.
    expect(className).toMatch(/(?:^|\s)xl:gap-12(?:\s|$)/);

    // The old bug-causing combination must be gone: no unconditional
    // `flex-wrap` and no unconditional `flex-1` grow on the row/columns.
    expect(className).not.toMatch(/(?:^|\s)flex-wrap(?:\s|$)/);
    const columns = row!.querySelectorAll(":scope > section, :scope > nav");
    expect(columns).toHaveLength(4);
    for (const column of columns) {
      expect(column.className).not.toMatch(/(?:^|\s)flex-1(?:\s|$)/);
    }
  });

  it("makes previously fixed-width column children fluid so they cannot overflow a narrower Chapter-5-derived column", () => {
    const { container } = renderWithIntl(<SiteFooter />, "ar");

    // Brand description (was a bare `w-[260px]`) — must shrink inside the
    // ~214px column produced at the low end of `lg` (1024px, see design note).
    const description = container.querySelector('[data-testid="footer-brand-description"]');
    expect(description).not.toBeNull();
    expect(description!.className).toMatch(/(?:^|\s)w-full(?:\s|$)/);
    expect(description!.className).toMatch(/max-w-\[260px\]/);
    expect(description!.className).not.toMatch(/(?:^|\s)w-\[260px\](?:\s|$)/);

    // Location map card (was a bare `w-[250px]`).
    const mapCard = container.querySelector('[data-testid="footer-map-card"]');
    expect(mapCard).not.toBeNull();
    expect(mapCard!.className).toMatch(/(?:^|\s)w-full(?:\s|$)/);
    expect(mapCard!.className).toMatch(/max-w-\[250px\]/);
    expect(mapCard!.className).not.toMatch(/(?:^|\s)w-\[250px\](?:\s|$)/);

    // Contact address text (was a bare `w-[200px]`).
    const address = container.querySelector('[data-testid="footer-address"]');
    expect(address).not.toBeNull();
    expect(address!.className).toMatch(/(?:^|\s)w-full(?:\s|$)/);
    expect(address!.className).toMatch(/max-w-\[200px\]/);
    expect(address!.className).not.toMatch(/(?:^|\s)w-\[200px\](?:\s|$)/);
  });
});
