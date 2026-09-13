import { describe, expect, it } from "vitest";
import { toMediaOptions } from "./media-options";

/**
 * The library as the API returns it, not as the picker wants it. The two
 * differ in the one field that matters — the API says `_id` — and a screen
 * that forwards the raw list draws a grid of tiles that select nothing.
 */
const asset = (over: Record<string, unknown> = {}) => ({
  _id: "asset-1",
  caption: { ar: "صورة", en: "Image" },
  file: { url: "https://cdn.example/portrait.jpg", mimeType: "image/jpeg" },
  ...over,
});

describe("turning the media library into pickable options", () => {
  it("carries the stored id across as the option's id", () => {
    expect(toMediaOptions([asset()])).toEqual([
      { id: "asset-1", caption: { ar: "صورة", en: "Image" }, url: "https://cdn.example/portrait.jpg" },
    ]);
  });

  /** An image field's question is "which picture". A PDF in the same library
   *  is not an answer it can offer. */
  it("leaves out anything that is not an image", () => {
    const pdf = asset({ _id: "doc-1", file: { url: "https://cdn.example/a.pdf", mimeType: "application/pdf" } });

    expect(toMediaOptions([asset(), pdf]).map((option) => option.id)).toEqual(["asset-1"]);
  });

  /** A row with no file is a broken record upstream; offering it as a tile
   *  makes it the editor's problem instead. */
  it("leaves out an asset with no usable file", () => {
    expect(toMediaOptions([asset({ _id: "broken", file: null })])).toEqual([]);
  });

  it("treats a refused library as an empty one", () => {
    expect(toMediaOptions(null)).toEqual([]);
  });
});
