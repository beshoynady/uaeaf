import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { MediaAssetPublic } from "@/lib/api/types";
import { HomeAlbumsSection } from "./albums-section";
import type { PhotoGallerySectionPublic } from "./load";

/**
 * What the homepage albums section composes, with the shared components' own
 * behaviour left to their own specs.
 *
 * 1. `enabled: false` draws nothing at all, whatever else the payload holds.
 * 2. An enabled section with nothing published draws nothing either.
 * 3. The editor's words head it; the catalogue names it when they are absent.
 * 4. The lead is an ink card with the mesh, holding the deck of its photos.
 * 5. Every card the API sent is drawn, at `h3`, and none is added.
 * 6. "All albums" beside the heading from `lg`, and last below it.
 */

// The deck needs a browser's observers; the section decides only what it gets.
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

const album = (index: number, overrides: Partial<AlbumListItem> = {}): AlbumListItem => ({
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
  previewPhotos: [photo(`p${index}-1`), photo(`p${index}-2`), photo(`p${index}-3`)],
  ...overrides,
});

const payload = (overrides: Partial<PhotoGallerySectionPublic> = {}): PhotoGallerySectionPublic => ({
  enabled: true,
  title: { ar: "ألبومات الصور", en: "Photo albums from the season" },
  subtitle: { ar: "لقطات من البطولات", en: "Moments from the championships" },
  eyebrow: { ar: "المركز الإعلامي", en: "Media Centre" },
  lead: album(1, { isFeatured: true }),
  items: [2, 3, 4, 5].map((n) => album(n)),
  ...overrides,
});

const draw = (section: PhotoGallerySectionPublic | null, locale: "ar" | "en" = "en") =>
  renderWithIntl(<HomeAlbumsSection section={section} locale={locale} />, locale);

describe("HomeAlbumsSection — when it draws nothing", () => {
  it("draws nothing at all when the section is switched off, even with albums in the payload", () => {
    const { container } = draw(payload({ enabled: false }));

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("draws nothing when the API could not be reached", () => {
    expect(draw(null).container).toBeEmptyDOMElement();
  });

  it("draws nothing when the section is on but no album is published", () => {
    // What the endpoint answers on a database without albums.
    const { container } = draw(payload({ lead: null, items: [] }));

    expect(container).toBeEmptyDOMElement();
  });
});

describe("HomeAlbumsSection — populated", () => {
  it("is a region named by its h2, under the editor's eyebrow and sentence", () => {
    draw(payload());

    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toHaveTextContent("Photo albums from the season");
    expect(screen.getByRole("region", { name: "Photo albums from the season" })).toBeInTheDocument();
    expect(screen.getByText("Media Centre")).toBeInTheDocument();
    expect(screen.getByText("Moments from the championships")).toBeInTheDocument();
  });

  it("falls back to the catalogue's heading, and leaves out an absent eyebrow and sentence", () => {
    draw(payload({ title: null, subtitle: null, eyebrow: null }), "ar");

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("ألبومات الصور");
    expect(screen.queryByText("المركز الإعلامي")).toBeNull();
  });

  it("leads with an ink card carrying the mesh, the deck of its photos and one link", () => {
    draw(payload());

    const lead = screen.getByRole("article", { name: "Album 1" });
    const ground = lead.firstElementChild as HTMLElement;
    expect(ground).toHaveAttribute("data-surface", "ink");
    expect(ground.firstElementChild).toHaveClass("brand-mesh");

    expect(within(lead).getByTestId("deck")).toHaveAttribute("data-covers", "3");
    expect(within(lead).getByRole("heading", { level: 3 })).toHaveTextContent("Album 1");
    const links = within(lead).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/en/media/albums/album-1");
  });

  it("draws no deck for a lead without photographs", () => {
    draw(payload({ lead: album(1, { previewPhotos: [] }) }));

    expect(screen.queryByTestId("deck")).toBeNull();
    expect(screen.getByRole("article", { name: "Album 1" })).toBeInTheDocument();
  });

  it("draws every card the API sent, at h3, without capping or padding", () => {
    const items = [2, 3, 4, 5, 6, 7, 8].map((n) => album(n));
    const { container } = draw(payload({ items }));

    const grid = container.querySelector("ul.grid") as HTMLElement;
    const cards = [...grid.children] as HTMLElement[];
    expect(cards).toHaveLength(7);
    expect(grid.className).toContain("lg:grid-cols-3");
    for (const [index, card] of cards.entries()) {
      expect(within(card).getByRole("heading", { level: 3 })).toHaveTextContent(`Album ${index + 2}`);
      expect(within(card).getByRole("link")).toHaveAttribute("href", `/en/media/albums/album-${index + 2}`);
    }
  });

  it("never draws the lead a second time among the cards", () => {
    draw(payload());

    expect(screen.getAllByRole("heading", { name: "Album 1" })).toHaveLength(1);
  });

  it("draws the cards alone when there is no lead", () => {
    draw(payload({ lead: null }));

    expect(screen.queryByTestId("deck")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4);
  });

  it("offers «كل الألبومات» beside the heading from lg, and after the cards below it", () => {
    const { container } = draw(payload(), "ar");

    const links = screen.getAllByRole("link", { name: "كل الألبومات" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/ar/media/albums");

    const [top, bottom] = links;
    // The header's copy lives in the kit's action slot, which is hidden below lg.
    const header = top.closest("header") as HTMLElement;
    expect(header.className).toContain("max-lg:[&>:last-child]:hidden");
    expect(header.lastElementChild?.contains(top)).toBe(true);
    expect(bottom.parentElement).toHaveClass("lg:hidden");

    // Reading order on a phone: the lead, then the cards, then the link.
    const lead = screen.getByRole("article", { name: "ألبوم 1" });
    const lastCard = container.querySelector("ul.grid")?.lastElementChild as HTMLElement;
    const follows = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(follows(lead, lastCard)).toBe(true);
    expect(follows(lastCard, bottom)).toBe(true);
    expect(container.querySelectorAll("h2")).toHaveLength(1);
  });
});
