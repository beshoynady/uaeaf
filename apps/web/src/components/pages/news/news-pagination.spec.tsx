import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { NewsPagination } from "./news-pagination";
import type { FeedQuery } from "@/lib/news/feed-query";

const messages = {
  News: {
    paginationLabel: "News pages",
    previousPage: "Previous page",
    nextPage: "Next page",
    goToPage: "Page {page}",
  },
};

const draw = (query: Partial<FeedQuery>, pages: number) =>
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <NewsPagination query={{ range: {}, page: 1, ...query }} pages={pages} />
    </NextIntlClientProvider>,
  );

describe("NewsPagination", () => {
  it("draws nothing at all when there is only one page", () => {
    // A pager over one page is a control that cannot do anything.
    const { container } = draw({}, 1);

    expect(container).toBeEmptyDOMElement();
  });

  it("links every page, and marks the one the reader is on", () => {
    draw({ page: 2 }, 3);

    // `Link` prefixes the locale, so the address a reader lands on is the
    // localised one — which is also what makes page 1 `/en/news` rather than
    // `/en/news?page=1`.
    expect(screen.getByRole("link", { name: "Page 1" })).toHaveAttribute("href", "/en/news");
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("href", "/en/news?page=3");
    // `aria-current`, so the page a reader is on reaches them whether or not
    // they can see which cell is filled.
    expect(screen.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });

  it("carries every other filter into each page link", () => {
    draw({ page: 1, topic: "records", tag: "relay", range: { from: "2026-01-01" } }, 2);

    expect(screen.getByRole("link", { name: "Page 2" })).toHaveAttribute(
      "href",
      "/en/news?tag=relay&topic=records&from=2026-01-01&page=2",
    );
  });

  it("offers no previous step on the first page", () => {
    // Absent rather than disabled: a disabled control that is focusable
    // announces an action a reader cannot take.
    draw({ page: 1 }, 3);

    expect(screen.queryByRole("link", { name: "Previous page" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("href", "/en/news?page=2");
  });

  it("offers no next step on the last page", () => {
    draw({ page: 3 }, 3);

    expect(screen.queryByRole("link", { name: "Next page" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("href", "/en/news?page=2");
  });

  it("uses links rather than buttons, so a page can be bookmarked and gone back from", () => {
    draw({ page: 2 }, 3);

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getAllByRole("link").length).toBeGreaterThan(0);
  });

  it("names itself, so a screen reader can skip past it", () => {
    draw({ page: 2 }, 3);

    expect(screen.getByRole("navigation", { name: "News pages" })).toBeInTheDocument();
  });
});
