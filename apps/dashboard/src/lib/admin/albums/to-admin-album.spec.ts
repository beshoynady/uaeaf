import { describe, expect, it } from "vitest";
import { toAdminAlbum, toAlbumPhotos } from "./to-admin-album";
import { pickPeople, searchPeople } from "./people";

describe("toAdminAlbum", () => {
  it("reads a raw Mongoose document, with `_id` and absent optionals", () => {
    const album = toAdminAlbum({
      _id: "66f0a1b2c3d4e5f607182901",
      title: { ar: "أ", en: "A" },
      slug: "a",
      publicationState: "Published",
      isFeatured: true,
      assetCount: 12,
      description: null,
    });
    expect(album).toMatchObject({
      id: "66f0a1b2c3d4e5f607182901",
      publicationState: "Published",
      isFeatured: true,
      assetCount: 12,
      description: null,
      seasonId: null,
      athleteIds: [],
    });
  });

  it("drops a row with no id and survives nonsense fields", () => {
    expect(toAdminAlbum({ title: { ar: "أ" } })).toBeNull();
    expect(toAdminAlbum({ _id: "x", publicationState: "Weird", assetCount: -3 })).toMatchObject({
      publicationState: "Draft",
      assetCount: 0,
    });
  });
});

describe("toAlbumPhotos", () => {
  it("picks this album's images out of the whole library, in display order", () => {
    const photo = (id: string, albumId: string, displayOrder: number, mimeType = "image/jpeg") => ({
      _id: id,
      albumId,
      displayOrder,
      altText: { ar: "ب", en: "b" },
      caption: { ar: "ت", en: "c" },
      file: { url: `https://cdn/${id}.jpg`, mimeType },
    });
    const photos = toAlbumPhotos(
      [photo("b", "album", 2), photo("a", "album", 1), photo("x", "other", 0), photo("pdf", "album", 0, "application/pdf")],
      "album",
    );
    expect(photos.map((entry) => entry.id)).toEqual(["a", "b"]);
  });
});

describe("people search", () => {
  const people = [
    { id: "1", name: { ar: "محمد علي", en: "Mohammed Ali" } },
    { id: "2", name: { ar: "علي حسن", en: "Ali Hassan" } },
    { id: "3", name: { ar: "نادي الوصل", en: "Al Wasl Club" } },
  ];

  it("matches either language, names that start with the term first", () => {
    expect(searchPeople(people, "ali").map((person) => person.id)).toEqual(["2", "1"]);
    expect(searchPeople(people, "الوصل").map((person) => person.id)).toEqual(["3"]);
  });

  it("ignores Arabic diacritics, so a vocalised search still finds the name", () => {
    expect(searchPeople(people, "مُحمد").map((person) => person.id)).toEqual(["1"]);
  });

  it("returns nothing for an empty term", () => {
    expect(searchPeople(people, "  ")).toEqual([]);
  });

  it("keeps a chosen id the list no longer holds, so it can still be removed", () => {
    expect(pickPeople(people, ["3", "gone"])).toEqual([people[2], { id: "gone", name: { ar: "", en: "" } }]);
  });
});
