import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArticleScreen } from "./article-screen";
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

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const article = (overrides: Partial<ArticlePublic> = {}): ArticlePublic =>
  ({
    id: "1",
    slug: "championship-results",
    title: { ar: "نتائج البطولة", en: "Championship results" },
    authorDisplayName: { ar: "القسم الإعلامي", en: "Media office" },
    publishDate: "2026-08-06T09:00:00.000Z",
    coverMediaId: null,
    body: { ar: paragraph("فاز المنتخب بالمركز الأول."), en: paragraph("The team took first place.") },
    excerpt: { ar: "فاز المنتخب", en: "The team won" },
    seo: null,
    ...overrides,
  }) as ArticlePublic;

describe("ArticleScreen", () => {
  it("gives the page exactly one h1, and it is the headline", () => {
    render(<ArticleScreen article={article()} locale="ar" related={[]} covers={new Map()} />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent("نتائج البطولة");
  });

  it("draws the body as elements and never as markup", () => {
    const hostile = {
      type: "doc",
      content: [{ type: "script", content: [{ type: "text", text: "alert(1)" }] }],
    };
    const { container } = render(
      <ArticleScreen
        article={article({ body: { ar: hostile, en: hostile } as never })}
        locale="ar"
        related={[]}
        covers={new Map()}
      />,
    );

    // The renderer is an allowlist that fails closed: a node it does not name
    // is not drawn. Nothing reaches the page as HTML, so a document that
    // somehow skipped server validation still cannot execute.
    expect(container.querySelector("script")).toBeNull();
    expect(container.innerHTML).not.toContain("alert(1)");
  });

  it("reads the locale's own body, not the other language's", () => {
    const { rerender } = render(
      <ArticleScreen article={article()} locale="ar" related={[]} covers={new Map()} />,
    );
    expect(screen.getByText("فاز المنتخب بالمركز الأول.")).toBeInTheDocument();
    expect(screen.queryByText("The team took first place.")).not.toBeInTheDocument();

    rerender(<ArticleScreen article={article()} locale="en" related={[]} covers={new Map()} />);
    expect(screen.getByText("The team took first place.")).toBeInTheDocument();
  });

  it("gives the publication date a machine-readable value", () => {
    render(<ArticleScreen article={article()} locale="ar" related={[]} covers={new Map()} />);

    const time = screen.getByText("2026-08-06");
    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-08-06T09:00:00.000Z");
  });

  it("names the byline the newsroom chose, not the account that typed it", () => {
    render(<ArticleScreen article={article()} locale="ar" related={[]} covers={new Map()} />);

    expect(screen.getByText(/القسم الإعلامي/)).toBeInTheDocument();
  });

  it("omits the related section entirely when there is nothing to relate", () => {
    render(<ArticleScreen article={article()} locale="ar" related={[]} covers={new Map()} />);

    expect(screen.queryByRole("heading", { name: /relatedHeading/ })).not.toBeInTheDocument();
  });

  it("lists related stories when there are some, excluding none of them silently", () => {
    const related = [
      article({ id: "2", slug: "second", title: { ar: "خبر ثان", en: "Second" } }),
      article({ id: "3", slug: "third", title: { ar: "خبر ثالث", en: "Third" } }),
    ];
    render(<ArticleScreen article={article()} locale="ar" related={related} covers={new Map()} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: /خبر ثان/ })).toHaveAttribute("href", "/news/second");
  });

  it("offers a way back to the listing", () => {
    render(<ArticleScreen article={article()} locale="ar" related={[]} covers={new Map()} />);

    expect(screen.getByRole("link", { name: /backToList/ })).toHaveAttribute("href", "/news");
  });
});
