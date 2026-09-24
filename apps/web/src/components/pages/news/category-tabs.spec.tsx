import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewsCategoryTabs } from "./category-tabs";
import type { FeedQuery } from "@/lib/news/feed-query";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const base: FeedQuery = { range: {}, page: 1 };
const tabs = () => within(screen.getByRole("navigation")).getAllByRole("link");

/**
 * Which shelf of the newsroom the listing shows: everything, the federation's
 * own reporting, or the round-ups of what other outlets published.
 *
 * Links and not an ARIA tab widget. `CMP-TABS-001` describes a widget that
 * swaps panels inside one page, and its roving tabindex belongs to that. Each
 * of these is a separate address — the rule this listing is built on — so the
 * WAI-ARIA practice for it is navigation with `aria-current`, which is also
 * what the topic chips beside it already do.
 */
describe("NewsCategoryTabs", () => {
  it("offers every shelf, with 'all' as the absence of the filter", () => {
    render(<NewsCategoryTabs query={base} />);

    expect(tabs().map((tab) => tab.getAttribute("href"))).toEqual([
      "/news",
      "/news?category=General",
      "/news?category=FederationInMedia",
    ]);
  });

  it("marks the open shelf for a reader who cannot see which tab is filled", () => {
    render(<NewsCategoryTabs query={{ ...base, category: "FederationInMedia" }} />);

    const current = tabs().filter((tab) => tab.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("href")).toBe("/news?category=FederationInMedia");
  });

  it("marks 'all' while no category narrows the feed", () => {
    render(<NewsCategoryTabs query={base} />);

    expect(tabs()[0].getAttribute("aria-current")).toBe("page");
  });

  it("carries the topic and the date window from one shelf to the next", () => {
    // The two axes are independent: a reader looking at international stories
    // who opens the media shelf is asking for both, not starting again.
    render(
      <NewsCategoryTabs query={{ topic: "international", range: { from: "2026-01-01" }, page: 3 }} />,
    );

    expect(tabs()[2].getAttribute("href")).toBe(
      "/news?category=FederationInMedia&topic=international&from=2026-01-01",
    );
  });
});
