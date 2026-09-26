import { describe, expect, it } from "vitest";

import {
  CDN_WIDTH,
  EAGER_RADIUS,
  RENDER_RADIUS,
  REVEAL_CAP,
  STAGE_SIZES,
  arrowStep,
  clampIndex,
  gridImageSrc,
  indexOfPhoto,
  padOrdinal,
  renderWindow,
  revealStep,
  shouldRequestMore,
  slideImage,
  thumbImageSrc,
  withPhotoParam,
} from "./photo-window";

/**
 * The viewer's cost model, pinned as numbers.
 *
 * A 48-photo album rendered naively is 48 full-width images requested on
 * arrival. These tests hold the limits that stop that: only a window of
 * slides is mounted at all (±8), only the photo in front is offered at stage
 * size, and even that one lets a phone take the 640px file instead of the
 * 1640px one the desktop stage needs.
 */

const CDN = "https://res.cloudinary.com/uaeaf/image/upload/v1712/albums/podium.jpg";

describe("renderWindow — the slides that exist in the DOM", () => {
  it("is ±8 around the current photo, and nothing more", () => {
    expect(RENDER_RADIUS).toBe(8);
    const window = renderWindow(20, 48);
    expect(window[0]).toBe(12);
    expect(window.at(-1)).toBe(28);
    expect(window).toHaveLength(17);
  });

  it("clips at the first photo instead of inventing negative indices", () => {
    expect(renderWindow(0, 48)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(renderWindow(3, 48)[0]).toBe(0);
  });

  it("clips at the last photo", () => {
    const window = renderWindow(47, 48);
    expect(window[0]).toBe(39);
    expect(window.at(-1)).toBe(47);
  });

  it("renders every photo of an album smaller than the window", () => {
    expect(renderWindow(2, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it("renders nothing for an empty album", () => {
    expect(renderWindow(0, 0)).toEqual([]);
  });

  it("never mounts more than 17 slides, whatever the album size", () => {
    for (const current of [0, 100, 250, 499]) {
      expect(renderWindow(current, 500).length).toBeLessThanOrEqual(2 * RENDER_RADIUS + 1);
    }
  });
});

describe("slideImage — what each slide asks the CDN for", () => {
  /** The `w_` width of every candidate in a srcset, with its descriptor. */
  const candidates = (srcSet: string | undefined) =>
    (srcSet ?? "").split(", ").map((entry) => {
      const [url, descriptor] = entry.split(" ");
      return { width: url.match(/w_(\d+)/)?.[1], descriptor };
    });

  it("offers the current photo at the phone stage's 640 and the desktop stage's 1640", () => {
    const image = slideImage(CDN, true);
    expect(candidates(image.srcSet)).toEqual([
      { width: "640", descriptor: "640w" },
      { width: "1640", descriptor: "1640w" },
    ]);
    expect(image.srcSet).toContain("/image/upload/f_auto,q_auto,w_640/");
  });

  it("tells the browser the stage's two boxes, so it chooses 640 on a phone and 1640 on a desktop", () => {
    expect(slideImage(CDN, true).sizes).toBe(STAGE_SIZES);
    expect(STAGE_SIZES).toBe("(min-width: 1024px) 820px, 300px");
    // The choice the browser makes: the smallest candidate at or above the
    // box times the screen's density.
    const pick = (box: number, density: number) =>
      [CDN_WIDTH.stageCompact, CDN_WIDTH.stage].find((width) => width >= box * density);
    expect(pick(300, 2)).toBe(640);
    expect(pick(820, 1)).toBe(1640);
    expect(pick(820, 2)).toBe(1640);
  });

  it("falls back to the desktop file for a browser without srcset", () => {
    expect(slideImage(CDN, true).src).toContain("w_1640");
  });

  it("asks for every side slide at w_480, with no srcset", () => {
    const side = slideImage(CDN, false);
    expect(side.src).toContain("/image/upload/f_auto,q_auto,w_480/");
    expect(side.srcSet).toBeUndefined();
    expect(side.sizes).toBeUndefined();
  });

  it("offers stage size to exactly one slide of a full window", () => {
    const window = renderWindow(20, 48);
    const staged = window.filter((index) => slideImage(CDN, index === 20).srcSet !== undefined);
    expect(staged).toEqual([20]);
  });

  it("fetches the two slides either side at once, and the rest when they near the screen", () => {
    expect(EAGER_RADIUS).toBe(2);
  });
});

describe("image URLs", () => {
  it("writes the width into a Cloudinary delivery URL", () => {
    expect(thumbImageSrc(CDN)).toContain("w_192");
    expect(gridImageSrc(CDN)).toContain("w_480");
  });

  it("leaves a URL on any other host untouched rather than breaking it", () => {
    expect(slideImage("/local/photo.jpg", true)).toEqual({ src: "/local/photo.jpg" });
    expect(slideImage("/local/photo.jpg", false)).toEqual({ src: "/local/photo.jpg" });
    expect(thumbImageSrc("/local/photo.jpg")).toBe("/local/photo.jpg");
  });
});

describe("arrowStep — keyboard direction follows reading direction", () => {
  it("moves forward on ArrowRight in English", () => {
    expect(arrowStep("ArrowRight", "ltr")).toBe(1);
    expect(arrowStep("ArrowLeft", "ltr")).toBe(-1);
  });

  it("reverses in Arabic, where forward is to the left", () => {
    expect(arrowStep("ArrowLeft", "rtl")).toBe(1);
    expect(arrowStep("ArrowRight", "rtl")).toBe(-1);
  });

  it("ignores every other key", () => {
    expect(arrowStep("ArrowUp", "rtl")).toBe(0);
    expect(arrowStep("Enter", "ltr")).toBe(0);
  });
});

describe("small helpers", () => {
  it("clamps an index into the album", () => {
    expect(clampIndex(-3, 10)).toBe(0);
    expect(clampIndex(12, 10)).toBe(9);
    expect(clampIndex(4, 10)).toBe(4);
    expect(clampIndex(4, 0)).toBe(0);
  });

  it("pads the counter to two digits, or to the total's width", () => {
    expect(padOrdinal(7, 48)).toBe("07");
    expect(padOrdinal(48, 48)).toBe("48");
    expect(padOrdinal(7, 120)).toBe("007");
  });

  it("finds a deep-linked photo by id, and answers -1 for a stale one", () => {
    const photos = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(indexOfPhoto(photos, "b")).toBe(1);
    expect(indexOfPhoto(photos, "gone")).toBe(-1);
    expect(indexOfPhoto(photos, null)).toBe(-1);
  });

  it("staggers the first 30 cells and starts every later one with the 30th", () => {
    expect(REVEAL_CAP).toBe(30);
    expect(revealStep(0)).toBe(0);
    expect(revealStep(12)).toBe(12);
    // The 30th cell is index 29: the last step, and the one every later cell shares.
    expect(revealStep(29)).toBe(29);
    expect(revealStep(30)).toBe(29);
    expect(revealStep(47)).toBe(29);
    const distinct = new Set(Array.from({ length: 200 }, (_, index) => revealStep(index)));
    expect(distinct.size).toBe(REVEAL_CAP);
  });

  it("asks for the next page only when the window reaches the loaded end", () => {
    expect(shouldRequestMore(10, 40, 48)).toBe(false);
    expect(shouldRequestMore(32, 40, 48)).toBe(true);
    expect(shouldRequestMore(47, 48, 48)).toBe(false);
  });
});

describe("withPhotoParam — the deep link", () => {
  it("sets ?photo and keeps the other parameters and the hash", () => {
    expect(withPhotoParam("https://uaeaf.ae/ar/media/albums/x?ref=home#photos", "p7")).toBe(
      "https://uaeaf.ae/ar/media/albums/x?ref=home&photo=p7#photos",
    );
  });

  it("replaces an existing photo rather than appending a second one", () => {
    expect(withPhotoParam("https://uaeaf.ae/ar/media/albums/x?photo=p1", "p2")).toBe(
      "https://uaeaf.ae/ar/media/albums/x?photo=p2",
    );
  });
});
