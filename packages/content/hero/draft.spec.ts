import { describe, expect, it } from "vitest";
import { HERO_IMAGE_MIN_WIDTH, isSmallImage, resolveLtrPicture } from "./draft";

const image = (url: string) => ({ url, width: 3840, height: 2160, altText: { ar: "ع", en: "E" } });
const desktop = { image: image("a.jpg"), focalPoint: { x: 30, y: 62 } };

describe("the English picture of a slide still being edited", () => {
  it("mirrors the picture and its focal point, as the API does for a saved slide", () => {
    expect(resolveLtrPicture("mirror", desktop, null)).toEqual({
      image: desktop.image,
      focalPoint: { x: 70, y: 62 },
      mirrored: true,
    });
  });

  it("keeps the picture as it is for same", () => {
    expect(resolveLtrPicture("same", desktop, null)).toEqual({ ...desktop, mirrored: false });
  });

  it("uses the separate picture with its own point, and nothing until both are chosen", () => {
    const separate = { image: image("b.jpg"), focalPoint: { x: 64, y: 45 } };
    expect(resolveLtrPicture("separate", desktop, separate)).toEqual({ ...separate, mirrored: false });
    expect(resolveLtrPicture("separate", desktop, null)).toBeNull();
  });

  it("has no English picture without a landscape one", () => {
    expect(resolveLtrPicture("mirror", null, null)).toBeNull();
  });
});

describe("a picture too small for the hero", () => {
  it("is measured against the widest hero at twice the density, and a phone at three times", () => {
    // The widest first screen in the geometry table is 1920px; a phone is 390px.
    expect(HERO_IMAGE_MIN_WIDTH).toEqual({ desktop: 3840, mobile: 1170 });
  });

  it("warns below the width and not at it", () => {
    expect(isSmallImage(1536, "desktop")).toBe(true);
    expect(isSmallImage(3840, "desktop")).toBe(false);
    expect(isSmallImage(1080, "mobile")).toBe(true);
    expect(isSmallImage(1170, "mobile")).toBe(false);
  });
});
