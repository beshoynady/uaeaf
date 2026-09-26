import { readFileSync } from "node:fs";
import { join } from "node:path";

import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AlbumFilterBar } from "./album-filter-bar";
import { EMPTY_ALBUM_QUERY } from "@/lib/albums/album-query";
import type { AlbumQuery } from "@/lib/albums/album-query";
import { EMPTY_ALBUM_FACETS } from "@/lib/albums/facet-options";
import type { AlbumFacetNames, AlbumFacets } from "@/lib/albums/album-types";

/**
 * The filter bar's one rule that matters most: a filter the facets cannot
 * fill is not in the page at all — neither the control nor its label. Today
 * every entity facet is empty, and the bar must be period and search alone.
 *
 * The rest: the controls come in the approved order, the competition waits
 * for a championship, every change reaches the address through one function,
 * and a reader can see and undo each filter in effect.
 */

vi.mock("next-intl", () => {
  const t = (key: string, values?: Record<string, unknown>) =>
    values ? `${key}(${Object.entries(values).map(([k, v]) => `${k}=${v}`).join(",")})` : key;
  t.rich = (key: string) => key;
  return {
    useTranslations: () => t,
    useLocale: () => "en",
    useFormatter: () => ({ dateTime: (date: Date) => date.toISOString().slice(0, 10) }),
  };
});

const push = vi.fn();
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/media/albums",
}));

/** Seasons are labels, not ids: the facet's id is what the reader sees. */
const SEASON = "2025\u20132026";
const EARLIER_SEASON = "2024\u20132025";

const ID = {
  championship: "b".repeat(24),
  competition: "c".repeat(24),
  event: "d".repeat(24),
  athlete: "e".repeat(24),
  club: "f".repeat(24),
};

const named = (id: string, en: string) => ({ id, name: { ar: en, en } });

const FULL_FACETS: AlbumFacets = {
  seasons: [
    { id: SEASON, count: 4 },
    { id: EARLIER_SEASON, count: 2 },
  ],
  championships: [{ id: ID.championship, count: 3 }],
  competitions: [{ id: ID.competition, count: 1 }],
  publicEvents: [{ id: ID.event, count: 2 }],
  athletes: [{ id: ID.athlete, count: 5 }],
  clubs: [{ id: ID.club, count: 6 }],
};

const FULL_NAMES: AlbumFacetNames = {
  championships: [named(ID.championship, "UAE Championship 2026")],
  competitions: [named(ID.competition, "100m final")],
  publicEvents: [named(ID.event, "National Sports Day")],
  athletes: [named(ID.athlete, "Hamad Al-Mansoori")],
  clubs: [named(ID.club, "Al Ain Club")],
};

const renderBar = (
  props: Partial<{ query: AlbumQuery; facets: AlbumFacets; names: AlbumFacetNames }> = {},
) => {
  const onQueryChange = vi.fn();
  const view = render(
    <AlbumFilterBar
      query={props.query ?? EMPTY_ALBUM_QUERY}
      facets={props.facets ?? EMPTY_ALBUM_FACETS}
      names={props.names ?? {}}
      total={9}
      shown={9}
      onQueryChange={onQueryChange}
    />,
  );
  return { ...view, onQueryChange };
};

/** The visible labels above the controls, in DOM order. */
const labels = (container: HTMLElement) =>
  [...container.querySelectorAll("label")].map((label) => label.textContent);

describe("a filter with no facet values is not in the page", () => {
  it("leaves period and search alone while every entity facet is empty", () => {
    const { container } = renderBar();

    expect(labels(container)).toEqual(["period", "search"]);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.getByRole("combobox", { name: "period" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "search" })).toBeInTheDocument();
  });

  it("removes the label along with the control, not just the options", () => {
    renderBar();
    for (const hidden of ["season", "occasion", "competition", "athlete", "club"]) {
      expect(screen.queryByText(hidden)).toBeNull();
      expect(screen.queryByLabelText(hidden)).toBeNull();
    }
  });

  it("draws exactly the facets that have values", () => {
    const { container } = renderBar({
      facets: { ...EMPTY_ALBUM_FACETS, athletes: FULL_FACETS.athletes },
      names: FULL_NAMES,
    });
    expect(labels(container)).toEqual(["athlete", "period", "search"]);
  });

  it("does not draw a facet whose values it cannot name", () => {
    const { container } = renderBar({ facets: { ...EMPTY_ALBUM_FACETS, clubs: FULL_FACETS.clubs } });
    expect(labels(container)).toEqual(["period", "search"]);
  });

  it("explains the missing filters only while some are missing", () => {
    renderBar();
    expect(screen.getByText("hiddenHint")).toBeInTheDocument();
  });
});

describe("with every facet filled", () => {
  it("draws the controls in the approved order, competition only under a championship", () => {
    const without = renderBar({ facets: FULL_FACETS, names: FULL_NAMES });
    expect(labels(without.container)).toEqual(["season", "occasion", "athlete", "club", "period", "search"]);
    expect(screen.queryByText("hiddenHint")).toBeNull();
    without.unmount();

    const within = renderBar({
      facets: FULL_FACETS,
      names: FULL_NAMES,
      query: { ...EMPTY_ALBUM_QUERY, championship: ID.championship },
    });
    expect(labels(within.container)).toEqual([
      "season",
      "occasion",
      "competition",
      "athlete",
      "club",
      "period",
      "search",
    ]);
  });

  it("offers championships and events in one select, as two groups", () => {
    renderBar({ facets: FULL_FACETS, names: FULL_NAMES });
    const select = screen.getByRole("combobox", { name: "occasion" });
    const groups = select.querySelectorAll("optgroup");
    expect([...groups].map((group) => group.label)).toEqual(["occasionChampionships", "occasionEvents"]);
    expect(within(groups[0]).getByRole("option")).toHaveTextContent("UAE Championship 2026");
    expect(within(groups[1]).getByRole("option")).toHaveTextContent("National Sports Day");
  });

  it("choosing an event replaces the championship and its competition", async () => {
    const { onQueryChange } = renderBar({
      facets: FULL_FACETS,
      names: FULL_NAMES,
      query: { ...EMPTY_ALBUM_QUERY, championship: ID.championship, competition: ID.competition, page: 3 },
    });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "occasion" }), `event:${ID.event}`);
    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({ event: ID.event, championship: undefined, competition: undefined, page: 1 }),
    );
  });

  it("applies a select the moment it changes, back on page 1", async () => {
    const { onQueryChange } = renderBar({
      facets: FULL_FACETS,
      names: FULL_NAMES,
      query: { ...EMPTY_ALBUM_QUERY, page: 4 },
    });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "athlete" }), ID.athlete);
    expect(onQueryChange).toHaveBeenCalledWith({ ...EMPTY_ALBUM_QUERY, athlete: ID.athlete, page: 1 });
  });
});

describe("the season, which is live", () => {
  const seasonsOnly = { ...EMPTY_ALBUM_FACETS, seasons: FULL_FACETS.seasons };

  it("draws its control from the facets alone, with no names to look up", () => {
    const { container } = renderBar({ facets: seasonsOnly });
    expect(labels(container)).toEqual(["season", "period", "search"]);
    // The entity filters with nothing to name them stay out of the page.
    for (const hidden of ["occasion", "competition", "athlete", "club"]) {
      expect(screen.queryByLabelText(hidden)).toBeNull();
    }
  });

  it("offers each season by its label, newest first, and the label is the value", () => {
    renderBar({ facets: seasonsOnly });
    const options = within(screen.getByRole("combobox", { name: "season" })).getAllByRole("option");
    expect(options.map((option) => option.textContent)).toEqual(["seasonAll", SEASON, EARLIER_SEASON]);
    expect(options.map((option) => (option as HTMLOptionElement).value)).toEqual(["", SEASON, EARLIER_SEASON]);
  });

  it("writes the chosen label, en dash and all, back on page 1", async () => {
    const { onQueryChange } = renderBar({ facets: seasonsOnly, query: { ...EMPTY_ALBUM_QUERY, page: 3 } });
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "season" }), EARLIER_SEASON);
    expect(onQueryChange).toHaveBeenCalledWith({ ...EMPTY_ALBUM_QUERY, season: EARLIER_SEASON, page: 1 });
  });

  it("shows the season in effect as selected", () => {
    renderBar({ facets: seasonsOnly, query: { ...EMPTY_ALBUM_QUERY, season: SEASON } });
    expect(screen.getByRole("combobox", { name: "season" })).toHaveValue(SEASON);
  });

  it("names the season's chip by its label, even one the facets no longer list", () => {
    renderBar({ facets: seasonsOnly, query: { ...EMPTY_ALBUM_QUERY, season: "2022\u20132023" } });
    expect(within(screen.getByRole("list", { name: "activeLabel" })).getByRole("button")).toHaveTextContent(
      "remove: season: 2022\u20132023 ×",
    );
  });

  it("writes the address with the label percent-encoded, not replaced", async () => {
    push.mockClear();
    render(<AlbumFilterBar query={EMPTY_ALBUM_QUERY} facets={seasonsOnly} names={{}} total={9} shown={9} />);
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "season" }), SEASON);
    expect(push).toHaveBeenCalledWith("/media/albums?season=2025%E2%80%932026", { scroll: false });
  });
});

describe("period", () => {
  it("offers the shared vocabulary, without the seven-day window", () => {
    renderBar();
    const values = within(screen.getByRole("combobox", { name: "period" }))
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);
    expect(values).toEqual(["any", "last30", "last90", "thisYear", "custom"]);
  });

  it("reveals the two dates only for a custom period", () => {
    renderBar();
    expect(screen.queryByLabelText("from")).toBeNull();
    renderBar({ query: { ...EMPTY_ALBUM_QUERY, period: "custom" } });
    expect(screen.getByLabelText("from")).toHaveAttribute("type", "date");
    expect(screen.getByLabelText("to")).toHaveAttribute("type", "date");
  });

  it("holds a backwards range, says so, and does not write it", () => {
    const { onQueryChange } = renderBar({
      query: { ...EMPTY_ALBUM_QUERY, period: "custom", range: { from: "2026-06-30" } },
    });
    fireEvent.change(screen.getByLabelText("to"), { target: { value: "2026-01-01" } });
    expect(screen.getByRole("status")).toHaveTextContent("rangeBackwards");
    expect(onQueryChange).not.toHaveBeenCalled();
  });

  it("writes a possible range at once", () => {
    const { onQueryChange } = renderBar({ query: { ...EMPTY_ALBUM_QUERY, period: "custom" } });
    fireEvent.change(screen.getByLabelText("from"), { target: { value: "2026-01-01" } });
    expect(onQueryChange).toHaveBeenCalledWith(
      expect.objectContaining({ period: "custom", range: { from: "2026-01-01", to: undefined } }),
    );
  });
});

describe("search", () => {
  it("applies on Enter, not on every keystroke", async () => {
    const { onQueryChange } = renderBar();
    await userEvent.type(screen.getByRole("searchbox"), "relay");
    expect(onQueryChange).not.toHaveBeenCalled();
    await userEvent.type(screen.getByRole("searchbox"), "{Enter}");
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ q: "relay", page: 1 }));
  });
});

describe("count, clearing and active filters", () => {
  it("announces the count politely", () => {
    renderBar();
    const count = screen.getByText("count(shown=9,total=9)");
    expect(count).toHaveAttribute("aria-live", "polite");
  });

  it("offers to clear only when something is filtered", () => {
    renderBar();
    expect(screen.queryByRole("button", { name: "clear" })).toBeNull();
    expect(screen.queryByRole("list", { name: "activeLabel" })).toBeNull();
  });

  it("clears every filter at once", async () => {
    const { onQueryChange } = renderBar({
      query: { ...EMPTY_ALBUM_QUERY, athlete: ID.athlete, q: "relay", period: "thisYear", page: 2 },
    });
    await userEvent.click(screen.getByRole("button", { name: "clear" }));
    expect(onQueryChange).toHaveBeenCalledWith(expect.objectContaining({ ...EMPTY_ALBUM_QUERY, athlete: undefined, q: undefined }));
  });

  it("lists each filter in effect, and each × removes just that one", async () => {
    const query: AlbumQuery = { ...EMPTY_ALBUM_QUERY, athlete: ID.athlete, club: ID.club, q: "relay" };
    const { onQueryChange } = renderBar({ query, facets: FULL_FACETS, names: FULL_NAMES });

    const chips = within(screen.getByRole("list", { name: "activeLabel" })).getAllByRole("button");
    expect(chips.map((chip) => chip.textContent)).toEqual([
      "remove: athlete: Hamad Al-Mansoori ×",
      "remove: club: Al Ain Club ×",
      "remove: searchChip(text=relay) ×",
    ]);

    await userEvent.click(chips[1]);
    expect(onQueryChange).toHaveBeenCalledWith({ ...query, club: undefined, page: 1 });
  });

  it("still shows a filter the facets cannot name, so it can be removed", () => {
    renderBar({ query: { ...EMPTY_ALBUM_QUERY, club: ID.club } });
    expect(within(screen.getByRole("list", { name: "activeLabel" })).getByRole("button")).toHaveTextContent("club");
  });
});

describe("without an onQueryChange", () => {
  it("writes the address itself, without scrolling", async () => {
    push.mockClear();
    render(
      <AlbumFilterBar query={EMPTY_ALBUM_QUERY} facets={EMPTY_ALBUM_FACETS} names={{}} total={0} shown={0} />,
    );
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "period" }), "thisYear");
    expect(push).toHaveBeenCalledWith("/media/albums?period=thisYear", { scroll: false });
  });
});

describe("the bar's composition", () => {
  const source = readFileSync(join(import.meta.dirname, "album-filter-bar.tsx"), "utf-8");

  it("stands on ink with a mesh and a green edge", () => {
    expect(source).toMatch(/<BrandBorder tone="green">\s*<Surface kind="ink" mesh/);
  });
});
