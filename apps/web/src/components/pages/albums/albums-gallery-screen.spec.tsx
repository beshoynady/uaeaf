import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { EMPTY_ALBUM_QUERY } from "@/lib/albums/album-query";
import type { AlbumQuery } from "@/lib/albums/album-query";
import { EMPTY_ALBUM_FACETS } from "@/lib/albums/facet-options";
import type { AlbumListItem, AlbumStats } from "@/lib/albums/album-types";
import type { MediaAssetPublic } from "@/lib/api/types";
import { AlbumsGalleryScreen } from "./albums-gallery-screen";

/**
 * What the gallery page composes, with the shared components' own behaviour
 * left to their own specs.
 *
 * 1. The filter bar is a direct sibling of the grid (its desktop sticky has
 *    nothing to stick within otherwise).
 * 2. Three different "empty"s, each with its own next step, and no filter bar
 *    over an archive with nothing published.
 * 3. The featured album is an ink card with the mesh, a badge, and one link.
 * 4. Desktop pages, the phone appends, and both keep the reader's filters.
 * 5. The hero shows exact figures, and none for an empty archive.
 */

// The two client components that need a browser's observers are stubbed: the
// page decides where they go and what they receive, not how they behave.
vi.mock("@/components/shared/albums/album-filter-bar", () => ({
  AlbumFilterBar: ({ total, shown }: { total: number; shown: number }) => (
    <div data-testid="filter-bar" data-total={total} data-shown={shown} />
  ),
}));
vi.mock("@/components/shared/albums/featured-album-deck", () => ({
  FeaturedAlbumDeck: ({ covers }: { covers: readonly unknown[] }) => (
    <div data-testid="deck" data-covers={covers.length} />
  ),
}));

const photo = (id: string): MediaAssetPublic => ({
  id,
  file: {
    url: `/media/${id}.jpg`,
    mimeType: "image/jpeg",
    width: 1600,
    height: 1000,
    size: 1,
    photographer: null,
    captureDate: null,
  },
  caption: { ar: "", en: "" },
  altText: { ar: `وصف ${id}`, en: `Alt ${id}` },
  displayOrder: 0,
  isFeatured: false,
});

const album = (
  index: number,
  overrides: Partial<AlbumListItem> = {},
): AlbumListItem => ({
  id: `a${index}`,
  title: { ar: `ألبوم ${index}`, en: `Album ${index}` },
  slug: `album-${index}`,
  description: null,
  championshipId: null,
  competitionId: null,
  publicEventId: null,
  athleteIds: [],
  clubIds: [],
  eventDate: "2026-03-14T00:00:00.000Z",
  location: { ar: "دبي", en: "Dubai" },
  isFeatured: false,
  championshipName: null,
  coverImageId: null,
  publishedAt: null,
  tags: [],
  assetCount: 12,
  previewPhotos: [photo(`p${index}`)],
  ...overrides,
});

const eight = Array.from({ length: 8 }, (_, index) => album(index + 1));

const draw = ({
  albums = eight,
  total = 20,
  query = EMPTY_ALBUM_QUERY,
  more = 0,
  stats = { albums: 20, photos: 2400, occasions: 35 },
  featured = null,
}: {
  albums?: AlbumListItem[];
  total?: number;
  query?: AlbumQuery;
  more?: number;
  stats?: AlbumStats | null;
  featured?: {
    album: AlbumListItem;
    covers: { id: string; photo: MediaAssetPublic }[];
  } | null;
} = {}) =>
  renderWithIntl(
    <AlbumsGalleryScreen
      locale="en"
      title="Photo gallery"
      subtitle="Moments from the federation."
      heroImage={undefined}
      stats={stats}
      featured={featured}
      albums={albums}
      total={total}
      facets={EMPTY_ALBUM_FACETS}
      names={{}}
      query={query}
      more={more}
      pageSize={8}
      maxMore={5}
    />,
    "en",
  );

describe("AlbumsGalleryScreen", () => {
  it("puts the filter bar directly beside the grid, and tells it how many are shown", () => {
    draw();

    const bar = screen.getByTestId("filter-bar");
    const grid = screen
      .getAllByRole("list")
      .find((list) => list.querySelector("article"))!;
    expect(bar.parentElement).toBe(grid.parentElement);
    expect(bar).toHaveAttribute("data-shown", "8");
    expect(bar).toHaveAttribute("data-total", "20");
    expect(within(grid).getAllByRole("article")).toHaveLength(8);
  });

  it("offers no filters and no pager over an archive with nothing published", () => {
    draw({
      albums: [],
      total: 0,
      stats: { albums: 0, photos: 0, occasions: 0 },
    });

    expect(screen.queryByTestId("filter-bar")).not.toBeInTheDocument();
    expect(screen.getByText("No albums published yet")).toBeInTheDocument();
    expect(
      screen.queryByRole("navigation", { name: "Album pages" }),
    ).not.toBeInTheDocument();
    // A hero announcing zero is a hole, not a statistic.
    expect(
      screen.queryByRole("list", { name: "The gallery in numbers" }),
    ).not.toBeInTheDocument();
  });

  it("suggests widening a filter that matches nothing, and clears it in one press", () => {
    draw({ albums: [], total: 0, query: { ...EMPTY_ALBUM_QUERY, q: "relay" } });

    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    expect(
      screen.getByText("No albums match these filters"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Try a wider period/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Show all albums" }),
    ).toHaveAttribute("href", "/en/media/albums");
  });

  it("sends a page number past the archive's end back to its first page", () => {
    draw({ albums: [], total: 20, query: { ...EMPTY_ALBUM_QUERY, page: 9 } });

    expect(
      screen.getByText("There are no albums on this page"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Back to the first page" }),
    ).toHaveAttribute("href", "/en/media/albums");
  });

  it("pages on desktop, keeping the reader's filters in every page link", () => {
    draw({ query: { ...EMPTY_ALBUM_QUERY, q: "final" } });

    const pager = screen.getByRole("navigation", { name: "Album pages" });
    expect(within(pager).getByRole("link", { name: "Page 3" })).toHaveAttribute(
      "href",
      "/en/media/albums?q=final&page=3",
    );
  });

  it("appends on a phone by one more page, through the address", () => {
    draw({ query: { ...EMPTY_ALBUM_QUERY, q: "final" } });

    expect(
      screen.getByRole("link", { name: "Show more albums" }),
    ).toHaveAttribute("href", "/en/media/albums?q=final&more=1");
  });

  it("offers no 'show more' once every album is on screen", () => {
    draw({
      albums: [
        ...eight,
        ...eight.slice(0, 4).map((item) => ({ ...item, id: `${item.id}b` })),
      ],
      total: 12,
      more: 1,
    });

    expect(
      screen.queryByRole("link", { name: "Show more albums" }),
    ).not.toBeInTheDocument();
  });

  it("moves to the next unread page once 'show more' reaches its cap", () => {
    draw({ total: 200, more: 5 });

    expect(
      screen.getByRole("link", { name: "Show more albums" }),
    ).toHaveAttribute("href", "/en/media/albums?page=7");
  });

  it("draws the featured album on ink with its mesh, a badge and one link to it", () => {
    const featured = album(99, {
      title: { ar: "المميز", en: "Nationals 2026" },
      slug: "nationals-2026",
      assetCount: 48,
    });
    const { container } = draw({
      featured: { album: featured, covers: [{ id: "c1", photo: photo("c1") }] },
    });

    const card = screen.getByRole("article", { name: "Nationals 2026" });
    // The ink ground is the card's own, with the mesh as its first child.
    const ground = card.firstElementChild!;
    expect(ground).toHaveAttribute("data-surface", "ink");
    expect(ground.firstElementChild).toHaveClass("brand-mesh");
    expect(within(card).getByText("Featured album")).toBeInTheDocument();
    expect(within(card).getAllByRole("link")).toHaveLength(1);
    expect(
      within(card).getByRole("link", { name: "View album" }),
    ).toHaveAttribute("href", "/en/media/albums/nationals-2026");
    expect(within(card).getByText("48 photos")).toBeInTheDocument();
    expect(within(card).getByTestId("deck")).toHaveAttribute(
      "data-covers",
      "1",
    );
    // The hero reserves the overlap the card is pulled into.
    expect(
      container.querySelector(".brand-page-hero .pb-\\[110px\\]"),
    ).not.toBeNull();
  });

  it("reserves no overlap in the hero when nothing is featured", () => {
    const { container } = draw();

    expect(container.querySelector(".pb-\\[110px\\]")).toBeNull();
  });

  it("shows the archive's exact figures, occasions first, with Latin digits", () => {
    draw();

    const figures = screen.getByRole("list", {
      name: "The gallery in numbers",
    });
    expect(
      within(figures)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["35Championships & events", "2,400Photos", "20Albums"]);
  });

  it("describes only the albums on screen in its structured data", () => {
    const { container } = draw({ albums: eight.slice(0, 2), total: 2 });

    const graphs = [
      ...container.querySelectorAll('script[type="application/ld+json"]'),
    ].map((node) => JSON.parse(node.textContent ?? "{}"));
    const gallery = graphs.find((graph) => graph["@type"] === "ImageGallery");
    expect(
      gallery.mainEntity.itemListElement.map(
        (item: { url: string }) => item.url,
      ),
    ).toEqual([
      expect.stringMatching(/\/en\/media\/albums\/album-1$/),
      expect.stringMatching(/\/en\/media\/albums\/album-2$/),
    ]);
    expect(graphs.some((graph) => graph["@type"] === "BreadcrumbList")).toBe(
      true,
    );
  });
});
