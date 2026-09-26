import { describe, expect, it } from "vitest";
import { readCover, readCreateAlbum, readPatchAlbum, readPhotoOrder } from "./requests";

const ID = "66f0a1b2c3d4e5f607182901";
const ID2 = "66f0a1b2c3d4e5f607182902";
const title = { ar: "ألبوم", en: "Album" };

describe("readCreateAlbum", () => {
  const album = { title, slug: "album", publicationState: "Draft", displayOrder: 0 };

  it("forwards a well-formed create with its two follow-up flags", () => {
    const parsed = readCreateAlbum({ album, publish: true, feature: false });
    expect(parsed).toEqual({ ok: true, body: { album, publish: true, feature: false } });
  });

  it("refuses Published: only PATCH :id/publish may reach it", () => {
    expect(readCreateAlbum({ album: { ...album, publicationState: "Published" } }).ok).toBe(false);
  });

  it("refuses an address that is not lowercase-hyphenated", () => {
    expect(readCreateAlbum({ album: { ...album, slug: "My Album" } }).ok).toBe(false);
  });

  it("refuses a null on create, where the DTO has no null", () => {
    expect(readCreateAlbum({ album: { ...album, seasonId: null } }).ok).toBe(false);
  });

  it("drops keys the API would refuse the whole request over", () => {
    const parsed = readCreateAlbum({ album: { ...album, isFeatured: true, publishedAt: "2026-01-01" } });
    expect(parsed.ok && parsed.body.album).not.toHaveProperty("isFeatured");
    expect(parsed.ok && parsed.body.album).not.toHaveProperty("publishedAt");
  });
});

describe("readPatchAlbum", () => {
  it("accepts the clears the update DTO declares nullable", () => {
    const parsed = readPatchAlbum({ album: { title, location: null, eventDate: null, seasonId: null } });
    expect(parsed.ok && parsed.body.album).toEqual({ title, location: null, eventDate: null, seasonId: null });
  });

  it("refuses a null description, which the API cannot clear", () => {
    expect(readPatchAlbum({ album: { title, description: null } }).ok).toBe(false);
  });

  it("never forwards the address or the state", () => {
    const parsed = readPatchAlbum({ album: { title, slug: "x", publicationState: "Published" } });
    expect(parsed.ok && parsed.body.album).toEqual({ title });
  });

  it("refuses a malformed id in the people lists", () => {
    expect(readPatchAlbum({ album: { title, athleteIds: ["nope"] } }).ok).toBe(false);
  });
});

describe("readPhotoOrder", () => {
  it("accepts a complete list of ids", () => {
    expect(readPhotoOrder({ photoIds: [ID, ID2] })).toEqual({ ok: true, body: { photoIds: [ID, ID2] } });
  });

  it("refuses an empty list and a list with a repeat — the API would answer 409", () => {
    expect(readPhotoOrder({ photoIds: [] }).ok).toBe(false);
    expect(readPhotoOrder({ photoIds: [ID, ID] }).ok).toBe(false);
  });
});

describe("readCover", () => {
  it("takes one photo id", () => {
    expect(readCover({ photoId: ID })).toEqual({ ok: true, body: { photoId: ID } });
    expect(readCover({ photoId: "x" }).ok).toBe(false);
  });
});
