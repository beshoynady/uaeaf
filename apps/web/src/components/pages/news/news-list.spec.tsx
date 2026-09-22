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


  describe("the two shelves", () => {
    it("draws the media round-up in a section of its own", () => {
      render(
        <NewsList
          articles={[article(1), article(2), article(3, "FederationInMedia")]}
          covers={new Map()}
          locale="ar"
        />,
      );

      expect(screen.getByRole("heading", { name: "inMediaHeading" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "generalHeading" })).toBeInTheDocument();
    });

    it("hides the media section entirely when nothing is filed there", () => {
      // "No empty shelf": a heading over nothing is worse than no heading.
      render(<NewsList articles={[article(1), article(2)]} covers={new Map()} locale="ar" />);

      expect(screen.queryByRole("heading", { name: "inMediaHeading" })).not.toBeInTheDocument();
    });

    it("leads with the newest story whichever shelf it is on", () => {
      render(<NewsList articles={[article(1, "FederationInMedia"), article(2)]} covers={new Map()} locale="ar" />);

      // The lead is the newest item, not the newest General item: a reader
      // opening the page wants what just happened, not what just happened in
      // one category.
      expect(screen.getByRole("heading", { level: 2, name: /خبر 1/ })).toBeInTheDocument();
    });
  });

  it("links every card by its own slug", () => {
    render(<NewsList articles={list(3)} covers={new Map()} locale="en" />);

    expect(screen.getByRole("link", { name: /Story 1/ })).toHaveAttribute("href", "/news/story-1");
    expect(screen.getByRole("link", { name: /Story 3/ })).toHaveAttribute("href", "/news/story-3");
  });
});
