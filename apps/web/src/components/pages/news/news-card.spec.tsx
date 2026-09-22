import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewsCard } from "./news-card";
import type { ArticlePublic } from "@/lib/api/types";

vi.mock("next-intl", () => ({
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString().slice(0, 10),
  }),
  useTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const article = (overrides: Partial<ArticlePublic> = {}): ArticlePublic => ({
  id: "1",
  category: "General",
  topic: null,
  tags: [],
  slug: "championship-results",
  title: { ar: "نتائج البطولة", en: "Championship results" },
  authorDisplayName: { ar: "القسم الإعلامي", en: "Media office" },
  publishDate: "2026-08-06T09:00:00.000Z",
  coverMediaId: null,
  body: { ar: { type: "doc" }, en: { type: "doc" } },
  excerpt: { ar: "فاز المنتخب", en: "The team won" },
  seo: null,
  ...overrides,
});

describe("NewsCard", () => {
  it("names the article once, as a link to its own address", () => {
    render(<NewsCard article={article()} locale="ar" />);

    const link = screen.getByRole("link", { name: /نتائج البطولة/ });
    expect(link).toHaveAttribute("href", "/news/championship-results");
    // One link for the whole card: a card with a linked image and a linked
    // headline is two stops on the same destination for a keyboard reader.
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("reads the locale's own half of every bilingual field", () => {
    const { rerender } = render(<NewsCard article={article()} locale="ar" />);
    expect(screen.getByText("نتائج البطولة")).toBeInTheDocument();
    expect(screen.queryByText("Championship results")).not.toBeInTheDocument();

    rerender(<NewsCard article={article()} locale="en" />);
    expect(screen.getByText("Championship results")).toBeInTheDocument();
  });

  it("carries the headline as the link's accessible name, not a bare 'read more'", () => {
    render(<NewsCard article={article()} locale="en" />);

    // "Read more" repeated down a grid tells a screen-reader user which of six
    // identical links they are on: none of them.
    const link = screen.getByRole("link");
    expect(link).toHaveAccessibleName(expect.stringContaining("Championship results"));
  });

  it("gives the date a machine-readable value beside the printed one", () => {
    render(<NewsCard article={article()} locale="ar" />);

    const time = screen.getByText("2026-08-06");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-08-06T09:00:00.000Z");
  });

  it("omits the date entirely rather than printing a placeholder for an absent one", () => {
    render(<NewsCard article={article({ publishDate: null })} locale="ar" />);

    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
  });

  it("draws the cover image when one resolves, and composes without it when none does", () => {
    const { rerender } = render(
      <NewsCard
        article={article({ coverMediaId: "m1" })}
        locale="ar"
        cover={{
          id: "m1",
          file: { url: "/cover.jpg", mimeType: "image/jpeg", width: 800, height: 450, size: 1, photographer: null, captureDate: null },
          altText: { ar: "صورة", en: "A photo" },
        } as never}
      />,
    );
    expect(screen.getByRole("img")).toHaveAttribute("alt", "صورة");

    // An article with no picture is an ordinary article, not a broken card.
    rerender(<NewsCard article={article()} locale="ar" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
