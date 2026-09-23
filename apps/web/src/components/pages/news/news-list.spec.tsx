import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewsList } from "./news-list";
import type { ArticlePublic } from "@/lib/api/types";

vi.mock("next-intl", () => ({
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const article = (n: number, category: ArticlePublic["category"] = "General"): ArticlePublic => ({
  id: String(n),
  category,
  topic: null,
  tags: [],
  slug: `story-${n}`,
  title: { ar: `خبر ${n}`, en: `Story ${n}` },
  authorDisplayName: { ar: "الإعلام", en: "Media" },
  publishDate: "2026-08-06T09:00:00.000Z",
  sourceOutlet: null,
  sourceUrl: null,
  coverMediaId: null,
  body: { ar: { type: "doc" }, en: { type: "doc" } },
  excerpt: { ar: `مقتطف ${n}`, en: `Excerpt ${n}` },
  seo: null,
});

const list = (count: number) => Array.from({ length: count }, (_, i) => article(i + 1));

describe("NewsList", () => {
  it("renders nothing at all when no article is live", () => {
    // "No empty shelf": a section with nothing in it is absent, not a heading
    // over a blank strip.
    const { container } = render(<NewsList articles={[]} covers={new Map()} locale="ar" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("leads with the newest story and grids the rest", () => {
    render(<NewsList articles={list(7)} covers={new Map()} locale="ar" />);

    // The lead is an h2; the grid's cards are h3s beneath it, so the page's
    // heading outline reads as one section rather than seven peers.
    expect(screen.getByRole("heading", { level: 2, name: /خبر 1/ })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6);
  });

  it("shows a single live article as the lead, with no empty grid under it", () => {
    render(<NewsList articles={list(1)} covers={new Map()} locale="ar" />);

    expect(screen.getByRole("heading", { level: 2, name: /خبر 1/ })).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", { level: 3 })).toHaveLength(0);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("presents the grid as a list, so its length is announced", () => {
    render(<NewsList articles={list(4)} covers={new Map()} locale="ar" />);

    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });


  /**
   * One grid, since 2026-09-22 (owner decision). The page drew two shelves
   * until then — the federation's own stories, and a separate row of its
   * `FederationInMedia` round-ups.
   */
  describe("the one grid", () => {
    it("puts a media round-up in the same grid as the federation's own stories", () => {
      render(
        <NewsList
          articles={[article(1), article(2), article(3, "FederationInMedia")]}
          covers={new Map()}
          locale="ar"
        />,
      );

      // One heading over one grid, and the round-up inside it rather than
      // under a second heading of its own.
      expect(screen.queryByRole("heading", { name: "inMediaHeading" })).not.toBeInTheDocument();
      expect(screen.getAllByRole("heading", { name: "generalHeading" })).toHaveLength(1);
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });

    it("keeps a round-up reachable rather than dropping it from the listing", () => {
      // The homepage's shelf is narrowed to `General`, and `homepage-news.ts`
      // records that the federation's own round-ups "stay on /news". Excluding
      // them here would leave them published at an address nothing links to.
      render(<NewsList articles={[article(1), article(2, "FederationInMedia")]} covers={new Map()} locale="en" />);

      expect(screen.getByRole("link", { name: /Story 2/ })).toHaveAttribute("href", "/news/story-2");
    });

    it("leads with the newest story whichever category it is in", () => {
      render(<NewsList articles={[article(1, "FederationInMedia"), article(2)]} covers={new Map()} locale="ar" />);

      // A reader opening the page wants what just happened, not what just
      // happened in one category.
      expect(screen.getByRole("heading", { level: 2, name: /خبر 1/ })).toBeInTheDocument();
    });
  });

  it("links every card by its own slug", () => {
    render(<NewsList articles={list(3)} covers={new Map()} locale="en" />);

    expect(screen.getByRole("link", { name: /Story 1/ })).toHaveAttribute("href", "/news/story-1");
    expect(screen.getByRole("link", { name: /Story 3/ })).toHaveAttribute("href", "/news/story-3");
  });
});
