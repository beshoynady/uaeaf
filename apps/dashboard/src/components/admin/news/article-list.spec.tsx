import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ArticleList } from "./article-list";
import type { Article, ReviewSummary } from "@/lib/admin/articles";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const article = (overrides: Partial<Article> = {}): Article => ({
  _id: "a1",
  title: { ar: "عنوان", en: "Headline" },
  slug: "headline",
  category: "General",
  coverMediaId: null,
  body: { ar: {}, en: {} },
  authorDisplayName: { ar: "الإعلام", en: "Media" },
  publishDate: null,
  publicationState: "Draft",
  archived: false,
  updatedAt: "2026-09-20T09:00:00.000Z",
  ...overrides,
});

const rows = () => screen.queryAllByRole("row").slice(1); // minus the header

describe("ArticleList", () => {
  it("says the newsroom is empty differently from a filter that matched nothing", async () => {
    const { rerender } = render(<ArticleList canCreate={false} articles={[]} reviews={new Map()} locale="ar" />);
    expect(screen.getByText("empty")).toBeInTheDocument();

    rerender(<ArticleList canCreate={false} articles={[article()]} reviews={new Map()} locale="ar" />);
    await userEvent.selectOptions(screen.getByLabelText("filterState"), "published");

    // Two different absences need two different next actions.
    expect(screen.getByText("emptyFiltered")).toBeInTheDocument();
  });

  it("shows every state, derived rather than stored", () => {
    const reviews = new Map<string, ReviewSummary>([
      ["a2", { workflowStatus: "InProgress" }],
      ["a3", { workflowStatus: "Rejected", revisionRequested: true }],
      ["a4", { workflowStatus: "Rejected" }],
    ]);
    render(
      <ArticleList canCreate={false}
        articles={[
          article(),
          article({ _id: "a2" }),
          article({ _id: "a3" }),
          article({ _id: "a4" }),
          article({ _id: "a5", publicationState: "Live" }),
          article({ _id: "a6", publicationState: "Live", archived: true }),
        ]}
        reviews={reviews}
        locale="ar"
      />,
    );

    // Scoped to the table: the same labels also fill the filter's options,
    // which is correct and would make a bare text query ambiguous.
    const body = screen.getByRole("table").querySelector("tbody") as HTMLElement;
    const shown = within(body)
      .getAllByRole("row")
      .map((row) => (row as HTMLTableRowElement).cells[1].textContent);

    expect(shown).toEqual([
      "state_draft",
      "state_inReview",
      "state_changesRequested",
      "state_rejected",
      "state_published",
      "state_hidden",
    ]);
  });

  it("narrows by state", async () => {
    render(
      <ArticleList canCreate={false}
        articles={[article(), article({ _id: "a2", publicationState: "Live" })]}
        reviews={new Map()}
        locale="ar"
      />,
    );
    expect(rows()).toHaveLength(2);

    await userEvent.selectOptions(screen.getByLabelText("filterState"), "published");
    expect(rows()).toHaveLength(1);
  });

  it("narrows by category", async () => {
    render(
      <ArticleList canCreate={false}
        articles={[article(), article({ _id: "a2", category: "FederationInMedia" })]}
        reviews={new Map()}
        locale="ar"
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("filterCategory"), "FederationInMedia");
    expect(rows()).toHaveLength(1);
  });

  it("searches both languages of the headline", async () => {
    render(
      <ArticleList canCreate={false}
        articles={[
          article({ title: { ar: "نتائج البطولة", en: "Championship results" } }),
          article({ _id: "a2", title: { ar: "دورة الحكام", en: "Officials course" } }),
        ]}
        reviews={new Map()}
        locale="ar"
      />,
    );

    await userEvent.type(screen.getByLabelText("search"), "نتائج");
    expect(rows()).toHaveLength(1);

    await userEvent.clear(screen.getByLabelText("search"));
    await userEvent.type(screen.getByLabelText("search"), "officials");
    // Case-insensitive on the English side: an editor typing lowercase is not
    // asking a different question.
    expect(rows()).toHaveLength(1);
  });

  it("links each row to its own editor", () => {
    render(<ArticleList canCreate={false} articles={[article()]} reviews={new Map()} locale="ar" />);

    expect(screen.getByRole("link", { name: "عنوان" })).toHaveAttribute("href", "/news/a1");
  });

  it("reads the locale's own headline", () => {
    const { rerender } = render(<ArticleList canCreate={false} articles={[article()]} reviews={new Map()} locale="ar" />);
    expect(screen.getByText("عنوان")).toBeInTheDocument();

    rerender(<ArticleList canCreate={false} articles={[article()]} reviews={new Map()} locale="en" />);
    expect(screen.getByText("Headline")).toBeInTheDocument();
  });

  it("offers a way to start an article to whoever may start one", () => {
    render(<ArticleList canCreate articles={[article()]} reviews={new Map()} locale="ar" />);

    // A link, not a button: starting an article is a navigation, and an
    // editor opening it in a new tab keeps the list they were working from.
    expect(screen.getByRole("link", { name: "newArticle" })).toHaveAttribute("href", "/news/new");
  });

  it("offers nothing to start to whoever may not", () => {
    render(<ArticleList canCreate={false} articles={[article()]} reviews={new Map()} locale="ar" />);

    // The route checks the same grant. Drawing the link without it offers a
    // screen that refuses, which reads as a broken dashboard rather than as a
    // permission somebody does not hold.
    expect(screen.queryByRole("link", { name: "newArticle" })).not.toBeInTheDocument();
  });
});
