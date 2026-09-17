import { describe, expect, it } from "vitest";
import { heroDevice, objectPosition, resolveImage } from "./image";
import type { HeroSlideLike } from "./image";

const image = (url: string) => ({ url, width: 3840, height: 2160, altText: { ar: "ع", en: "E" } });

const slide = (overrides: Partial<HeroSlideLike> = {}): HeroSlideLike => ({
  desktop: { image: image("a.jpg"), focalPoint: { x: 30, y: 62 } },
  desktopLtr: { image: image("a.jpg"), focalPoint: { x: 70, y: 62 }, mirrored: true },
  mobile: null,
  ...overrides,
});

describe("which picture a reader sees, and where the crop holds", () => {
  it("gives Arabic the composed picture, never flipped", () => {
    expect(resolveImage(slide(), "ar", "desktop")).toMatchObject({
      source: "desktop",
      mirrored: false,
      objectPosition: "30% 62%",
      origin: "30% 62%",
    });
  });

  it("gives English the mirrored picture: cropped on the stored point, the camera on the flipped one", () => {
    expect(resolveImage(slide(), "en", "desktop")).toMatchObject({
      source: "ltr",
      mirrored: true,
      objectPosition: "30% 62%",
      origin: "70% 62%",
    });
  });

  it("gives English a separate picture as it is", () => {
    const pick = resolveImage(
      slide({ desktopLtr: { image: image("b.jpg"), focalPoint: { x: 64, y: 45 }, mirrored: false } }),
      "en",
      "desktop",
    );
    expect(pick).toMatchObject({ source: "ltr", mirrored: false, objectPosition: "64% 45%" });
    expect(pick?.image.url).toBe("b.jpg");
  });

  it("falls back to the composed picture, unflipped, when the English one is missing", () => {
    expect(resolveImage(slide({ desktopLtr: null }), "en", "desktop")).toMatchObject({
      source: "desktop",
      mirrored: false,
    });
  });

  it.each(["ar", "en"] as const)("gives a phone the portrait picture in %s, never flipped", (locale) => {
    const mobile = { image: image("m.jpg"), focalPoint: { x: 20, y: 80 } };
    expect(resolveImage(slide({ mobile }), locale, "mobile")).toMatchObject({
      source: "mobile",
      mirrored: false,
      objectPosition: "20% 80%",
      origin: "20% 80%",
    });
  });

  it("gives a phone without a portrait picture the landscape one for its language, flip included", () => {
    expect(resolveImage(slide(), "en", "mobile")).toMatchObject({ source: "ltr", mirrored: true });
  });

  it("treats a tablet as a desktop: the phone picture switches below 641px", () => {
    const mobile = { image: image("m.jpg"), focalPoint: { x: 20, y: 80 } };
    expect(resolveImage(slide({ mobile }), "ar", "tablet")?.source).toBe("desktop");
    expect(heroDevice(640)).toBe("mobile");
    expect(heroDevice(641)).toBe("tablet");
    expect(heroDevice(1024)).toBe("desktop");
  });

  it("has nothing to draw without a landscape picture", () => {
    expect(resolveImage(slide({ desktop: null }), "ar", "desktop")).toBeNull();
  });

  it("anchors a mirrored crop on the picture's own point", () => {
    expect(objectPosition({ x: 70, y: 40 }, true)).toBe("30% 40%");
    expect(objectPosition({ x: 70, y: 40 }, false)).toBe("70% 40%");
  });
});
