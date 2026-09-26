import { afterEach, describe, expect, it, vi } from "vitest";
import { EMPTY_ALBUM_QUERY } from "@/lib/albums/album-query";
import type { MediaAssetPublic } from "@/lib/api/types";

/**
 * The album pages' reads: which requests they make, and how they shape what
 * comes back. `fetchPublic` is replaced, so these say what the pages ask the
 * API for without an API.
 */

const fetchPublic = vi.fn();
vi.mock("@/lib/api/public-client", () => ({
  fetchPublic: (...args: unknown[]) => fetchPublic(...args),
}));

const {
  MAX_MORE,
  PHOTO_PAGE_SIZE,
  asListItem,
  loadAlbumDetail,
  loadAlbumList,
  loadAlbumThrough,
  loadFacetNames,
  loadFeaturedAlbum,
  readMoreParam,
  toViewerPhoto,
} = await import("./load");
const { appendPhotoPage, createPhotoPager } = await import("./photo-pager");

const asset = (
  id: string,
  photographer: string | null = null,
): MediaAssetPublic => ({
  id,
  file: {
    url: `/m/${id}.jpg`,
    mimeType: "image/jpeg",
    width: 1200,
    height: 800,
    size: 1,
    photographer,
    captureDate: null,
  },
  caption: { ar: "تعليق", en: "  " },
  altText: { ar: "بديل", en: "Alt" },
  displayOrder: 0,
  isFeatured: false,
});

const albumRecord = {
  id: "a1",
  title: { ar: "أ", en: "A" },
  slug: "a",
  description: null,
  championshipId: null,
  competitionId: null,
  publicEventId: null,
  athleteIds: [],
  clubIds: [],
  eventDate: null,
  location: null,
  isFeatured: true,
  championshipName: null,
  coverImageId: "c",
  publishedAt: null,
  tags: [],
  assetCount: 7,
};

afterEach(() => fetchPublic.mockReset());

describe("readMoreParam", () => {
  it("reads a positive count, clamps it, and ignores anything else", () => {
    expect(readMoreParam({})).toBe(0);
    expect(readMoreParam({ more: "2" })).toBe(2);
    expect(readMoreParam({ more: "99" })).toBe(MAX_MORE);
    expect(readMoreParam({ more: "-1" })).toBe(0);
    expect(readMoreParam({ more: "x" })).toBe(0);
  });
});

describe("loadAlbumList", () => {
  it("reads the page and each extra page at the fixed size of 8", async () => {
    fetchPublic.mockImplementation(async (path: string) => ({
      items: [{ id: path }],
      total: 30,
      page: 1,
      limit: 8,
    }));

    const list = await loadAlbumList({ ...EMPTY_ALBUM_QUERY, page: 2 }, 1);

    const paths = fetchPublic.mock.calls.map(([path]) => path as string);
    expect(paths).toHaveLength(2);
    expect(paths[0]).toMatch(/^\/albums\/public\?page=2&limit=8/);
    expect(paths[1]).toMatch(/^\/albums\/public\?page=3&limit=8/);
    expect(list).toEqual({
      items: [{ id: paths[0] }, { id: paths[1] }],
      total: 30,
    });
  });

  it("is null when the first page cannot be read", async () => {
    fetchPublic.mockResolvedValue(null);

    expect(await loadAlbumList(EMPTY_ALBUM_QUERY, 0)).toBeNull();
  });
});

describe("loadFacetNames", () => {
  it("makes no request for a facet with nothing to name", async () => {
    const names = await loadFacetNames({
      seasons: [],
      championships: [],
      competitions: [],
      publicEvents: [],
      athletes: [],
      clubs: [],
    });

    expect(fetchPublic).not.toHaveBeenCalled();
    expect(names).toEqual({ athletes: [], clubs: [] });
  });

  it("reads no names for seasons, whose label is their name", async () => {
    const names = await loadFacetNames({
      seasons: [{ id: "2025\u20132026", count: 12 }],
      championships: [],
      competitions: [],
      publicEvents: [],
      athletes: [],
      clubs: [],
    });

    expect(fetchPublic).not.toHaveBeenCalled();
    expect(names).toEqual({ athletes: [], clubs: [] });
  });
});

describe("loadAlbumList and the season", () => {
  it("asks the API for the season by its label", async () => {
    fetchPublic.mockResolvedValue({ items: [], total: 0, page: 1, limit: 8 });

    await loadAlbumList({ ...EMPTY_ALBUM_QUERY, season: "2025\u20132026" }, 0);

    const [path] = fetchPublic.mock.calls[0] as [string];
    expect(new URL(path, "http://x").searchParams.get("season")).toBe("2025\u20132026");
  });
});

describe("loadFeaturedAlbum", () => {
  it("is null when nothing is featured, which the API answers with a null body", async () => {
    fetchPublic.mockResolvedValue(null);

    expect(await loadFeaturedAlbum()).toBeNull();
  });

  it("takes up to five covers from the album's own photos, the cover first", async () => {
    const photos = ["p1", "p2", "c", "p3", "p4", "p5"].map((id) => asset(id));
    fetchPublic.mockImplementation(async (path: string) =>
      path === "/albums/public/featured"
        ? albumRecord
        : {
            album: albumRecord,
            mediaAssets: photos,
            photoTotal: photos.length,
            photoSkip: 0,
            relatedAlbums: [],
          },
    );

    const featured = await loadFeaturedAlbum();

    expect(featured?.covers.map((cover) => cover.id)).toEqual([
      "c",
      "p1",
      "p2",
      "p3",
      "p4",
    ]);
    expect(featured?.album.previewPhotos.map((photo) => photo.id)).toEqual([
      "c",
      "p1",
      "p2",
    ]);
  });
});

describe("asListItem", () => {
  it("falls back to the first photo when the cover is not among them", () => {
    const item = asListItem({
      album: { ...albumRecord, coverImageId: "gone" },
      mediaAssets: [asset("p1"), asset("p2")],
      photoTotal: 2,
      photoSkip: 0,
      relatedAlbums: [],
    });

    expect(item.previewPhotos.map((photo) => photo.id)).toEqual(["p1", "p2"]);
  });
});

describe("toViewerPhoto", () => {
  it("maps the file, the reader's language, and a credit only where there is a photographer", () => {
    expect(toViewerPhoto(asset("p1", "A. Photographer"), "ar")).toEqual({
      id: "p1",
      src: "/m/p1.jpg",
      width: 1200,
      height: 800,
      alt: "بديل",
      caption: "تعليق",
      credit: "A. Photographer",
    });

    const bare = toViewerPhoto(asset("p2"), "en");
    // A blank caption and no photographer print nothing, never a placeholder;
    // the public DTO has no issuing body, so `source` is never set.
    expect(bare.caption).toBeNull();
    expect(bare.credit).toBeNull();
    expect(bare).not.toHaveProperty("source");
  });
});

describe("photo pages", () => {
  const page = (ids: string[], skip: number, total: number) => ({
    album: albumRecord,
    mediaAssets: ids.map((id) => asset(id)),
    photoTotal: total,
    photoSkip: skip,
    relatedAlbums: [],
  });

  it("asks for the first page at skip=0", async () => {
    fetchPublic.mockResolvedValue(page(["p1"], 0, 1));

    await loadAlbumDetail("final 100m");

    expect(fetchPublic).toHaveBeenCalledWith(
      "/albums/public/final%20100m?skip=0",
      ["albums"],
    );
  });

  it("asks for a later page at the offset of the photos already held", async () => {
    fetchPublic.mockResolvedValue(page(["p41"], 40, 90));

    await loadAlbumDetail("final", PHOTO_PAGE_SIZE);

    expect(fetchPublic).toHaveBeenCalledWith("/albums/public/final?skip=40", [
      "albums",
    ]);
  });

  it("reads on, page by page, until it holds the photo the address names", async () => {
    const ids = (from: number) =>
      Array.from({ length: 40 }, (_, index) => `p${from + index}`);
    fetchPublic.mockImplementation(async (path: string) => {
      const skip = Number(new URL(path, "http://x").searchParams.get("skip"));
      return page(ids(skip), skip, 100);
    });

    const detail = await loadAlbumThrough("final", "p57");

    expect(fetchPublic.mock.calls.map(([path]) => path)).toEqual([
      "/albums/public/final?skip=0",
      "/albums/public/final?skip=40",
    ]);
    expect(detail?.mediaAssets).toHaveLength(80);
  });

  it("stops at the album's end for an id that is not in it", async () => {
    fetchPublic.mockImplementation(async (path: string) => {
      const skip = Number(new URL(path, "http://x").searchParams.get("skip"));
      return page(skip === 0 ? ["a", "b"] : ["c"], skip, 3);
    });

    const detail = await loadAlbumThrough("final", "650000000000000000000009");

    expect(fetchPublic).toHaveBeenCalledTimes(2);
    expect(detail?.mediaAssets.map((photo) => photo.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("reads one page only when no photo is named", async () => {
    fetchPublic.mockResolvedValue(page(["a"], 0, 90));

    await loadAlbumThrough("final", null);

    expect(fetchPublic).toHaveBeenCalledTimes(1);
  });
});

describe("createPhotoPager", () => {
  const viewer = (id: string) => ({
    id,
    src: `/m/${id}.jpg`,
    width: 1,
    height: 1,
    alt: "",
  });

  it("refuses a repeat request while one is in flight, then reads the next offset", async () => {
    let answer: (value: {
      photos: ReturnType<typeof viewer>[];
      total: number;
    }) => void = () => {};
    const read = vi.fn(
      (skip: number) =>
        new Promise<{ photos: ReturnType<typeof viewer>[]; total: number }>(
          (resolve) => {
            answer = resolve;
            void skip;
          },
        ),
    );
    const request = createPhotoPager(read);

    // The viewer's effect fires twice for the same window before the answer.
    const first = request(40, 120);
    const repeat = request(40, 120);

    expect(read).toHaveBeenCalledTimes(1);
    expect(read).toHaveBeenCalledWith(40);
    expect(await repeat).toBeNull();

    answer({ photos: [viewer("p41")], total: 120 });
    expect(await first).toEqual({
      skip: 40,
      photos: [viewer("p41")],
      total: 120,
    });

    // Released once answered: the next page is asked for at the new count.
    void request(80, 120);
    expect(read).toHaveBeenLastCalledWith(80);
  });

  it("releases the slot after a failed read, so the next move asks again", async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(null);
    const request = createPhotoPager(read);

    expect(await request(40, 90)).toBeNull();
    await request(40, 90);

    expect(read).toHaveBeenCalledTimes(2);
  });

  it("asks for nothing once every photo is held", async () => {
    const read = vi.fn();
    const request = createPhotoPager(read);

    expect(await request(90, 90)).toBeNull();
    expect(read).not.toHaveBeenCalled();
  });
});

describe("appendPhotoPage", () => {
  const viewer = (id: string) => ({
    id,
    src: "",
    width: 1,
    height: 1,
    alt: "",
  });

  it("appends a page that starts where the held photos end, and drops any other", () => {
    const held = [viewer("a"), viewer("b")];

    expect(
      appendPhotoPage(held, { skip: 2, photos: [viewer("c")], total: 3 }).map(
        (p) => p.id,
      ),
    ).toEqual(["a", "b", "c"]);
    // A page answered twice, or late, must not duplicate photos.
    expect(
      appendPhotoPage(held, { skip: 0, photos: [viewer("a")], total: 3 }),
    ).toBe(held);
  });
});
