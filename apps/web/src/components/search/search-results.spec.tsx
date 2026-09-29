import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { SearchResults } from "./search-results";
import type { SearchGroup } from "@/lib/search/client";

/**
 * `MAX_LIMIT` (`lib/search/client.ts`) is the endpoint's own ceiling: a
 * group's `items` cannot be raised past 10 through this API no matter how
 * high `total` is. "Show more" has to know that boundary rather than assume
 * unlimited paging.
 */

const hit = (id: string, title: string) => ({ id, title, subtitle: null, href: `/news/${id}`, thumbnailId: null });

const group = (count: number, total: number): SearchGroup => ({
  type: "articles",
  total,
  items: Array.from({ length: count }, (_, index) => hit(String(index), `Story ${index}`)),
});

const renderResults = (groups: readonly SearchGroup[], onRequestMore = vi.fn()) =>
  renderWithIntl(
    <SearchResults
      listId="l"
      groups={groups}
      state="ready"
      term="x"
      activeId={null}
      onActiveChange={vi.fn()}
      onRequestMore={onRequestMore}
      loadingMore={new Set()}
    />,
    "en",
  );

describe("SearchResults — show more and its ceiling", () => {
  it("offers show more while under both the group's own total and the endpoint's ceiling", () => {
    renderResults([group(5, 8)]);
    expect(screen.getByRole("button", { name: /Show more/i })).toBeInTheDocument();
  });

  it("asks for its own type when clicked", async () => {
    const user = userEvent.setup();
    const onRequestMore = vi.fn();
    renderResults([group(5, 8)], onRequestMore);

    await user.click(screen.getByRole("button", { name: /Show more/i }));
    expect(onRequestMore).toHaveBeenCalledWith("articles");
  });

  it("hides show more once the endpoint's 10-item ceiling is reached, even though more remain", () => {
    renderResults([group(10, 37)]);
    expect(screen.queryByRole("button", { name: /Show more/i })).not.toBeInTheDocument();
  });

  it("hides show more once every match is already shown, below the ceiling", () => {
    renderResults([group(3, 3)]);
    expect(screen.queryByRole("button", { name: /Show more/i })).not.toBeInTheDocument();
  });

  it("disables the control while its own expansion is in flight", () => {
    renderWithIntl(
      <SearchResults
        listId="l"
        groups={[group(5, 8)]}
        state="ready"
        term="x"
        activeId={null}
        onActiveChange={vi.fn()}
        onRequestMore={vi.fn()}
        loadingMore={new Set(["articles"])}
      />,
      "en",
    );
    expect(screen.getByRole("button", { name: /Show more/i })).toBeDisabled();
  });
});
