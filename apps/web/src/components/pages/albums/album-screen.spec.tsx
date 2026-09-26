import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { AlbumListItem } from "@/lib/albums/album-types";
import type { ViewerPhoto } from "@/lib/albums/photo-window";
import type { MediaAssetPublic } from "@/lib/api/types";
import { ALBUM_VIEWER_ID, AlbumScreen } from "./album-screen";

/**
 * What the album page composes.
 *
 * 1. The hero: the title as the one `h1`, a trail back to the gallery, the
 *    meta row, the occasion chips, and a play button that links to the viewer.
 * 2. The viewer receives every photo, the server's `?photo=`, and the anchor.
 * 3. The related strip: four cards, the last two hidden on a phone, and a way
 *    back to the gallery — or nothing at all when there are none.
 */

const viewerProps = vi.fn();
// The Server Action is a server boundary; the screen only hands it over.
vi.mock("@/app/[locale]/media/albums/_data/actions", () => ({
  readAlbumPhotos: vi.fn(),
}));
vi.mock("@/components/shared/albums/album-viewer", () => ({
  AlbumViewer: (props: {
    photos: readonly ViewerPhoto[];
    id?: string;
    initialPhotoId?: string | null;
  }) => {
    viewerProps(props);
    return <section id={props.id} data-testid="viewer" />;
  },
  requestAlbumSlideshow: vi.fn(),
}));

const asset = (id: string): MediaAssetPublic => ({
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

const viewerPhoto = (id: string): ViewerPhoto => ({
  id,
  src: `/media/${id}.jpg`,
  width: 1600,
  height: 1000,
  alt: `Alt ${id}`,
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
  assetCount: 3,
  previewPhotos: [asset(`p${index}`)],
  ...overrides,
});

const draw = ({
  related = [album(2), album(3), album(4), album(5)],
  photos = ["p1", "p2", "p3"].map(viewerPhoto),
} = {}) => {
  const { previewPhotos: _unused, ...subject } = album(1, {
    title: { ar: "بطولة الإمارات", en: "UAE Championship 2026" },
    championshipId: "650000000000000000000001",
    championshipName: {
      ar: "بطولة الإمارات 2026",
      en: "UAE Championship 2026",
    },
  });
  return renderWithIntl(
    <AlbumScreen
      locale="en"
      album={subject}
      photos={photos}
      cover={asset("p1")}
      related={related}
      photoTotal={photos.length === 0 ? 0 : 120}
      initialPhotoId="p2"
      galleryName="Photo albums"
    />,
    "en",
  );
};

describe("AlbumScreen", () => {
  it("names the album in the page's one heading, with a trail back to the gallery", () => {
    draw();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "UAE Championship 2026",
    );
    const trail = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(trail).getByRole("link", { name: "Photo albums" }),
    ).toHaveAttribute("href", "/en/media/albums");
  });

  it("prints the date, place and photo count, and the occasion as a chip", () => {
    draw();

    const meta = screen.getByRole("list", { name: "Album details" });
    expect(within(meta).getByText("Dubai")).toBeInTheDocument();
    // The album's whole count, not the first page's.
    expect(within(meta).getByText("120 photos")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Affiliation" })).toHaveTextContent(
      "UAE Championship 2026",
    );
  });

  it("links the play button to the viewer it starts", () => {
    draw();

    expect(
      screen.getByRole("link", { name: "Play slideshow" }),
    ).toHaveAttribute("href", `#${ALBUM_VIEWER_ID}`);
    expect(screen.getByTestId("viewer")).toHaveAttribute("id", ALBUM_VIEWER_ID);
  });

  it("offers no play button for an album with no photos yet", () => {
    draw({ photos: [] });

    expect(
      screen.queryByRole("link", { name: "Play slideshow" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Copy album link" }),
    ).toBeInTheDocument();
  });

  it("hands the viewer the first page, the album total, and the photo the address asked for", () => {
    viewerProps.mockClear();
    draw();

    const props = viewerProps.mock.calls.at(-1)![0];
    expect(props.photos.map((photo: ViewerPhoto) => photo.id)).toEqual([
      "p1",
      "p2",
      "p3",
    ]);
    expect(props.initialPhotoId).toBe("p2");
    expect(props.total).toBe(120);
    expect(typeof props.onRequestMore).toBe("function");
  });

  it("draws four related cards and hides the last two on a phone", () => {
    draw();

    const heading = screen.getByRole("heading", { name: "Related albums" });
    const section = heading.closest("section")!;
    const items = within(section)
      .getAllByRole("listitem")
      .filter((item) => item.querySelector("article"));
    expect(items).toHaveLength(4);
    expect(
      items.map((item) => item.classList.contains("max-lg:hidden")),
    ).toEqual([false, false, true, true]);
    expect(
      within(section).getByRole("link", { name: "All albums" }),
    ).toHaveAttribute("href", "/en/media/albums");
  });

  it("draws no related strip when there are no related albums", () => {
    draw({ related: [] });

    expect(
      screen.queryByRole("heading", { name: "Related albums" }),
    ).not.toBeInTheDocument();
  });
});
