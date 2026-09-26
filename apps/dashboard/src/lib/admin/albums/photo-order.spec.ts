import { describe, expect, it } from "vitest";
import { moveBy, moveTo } from "./photo-order";
import { generatedAltText, generatedCaption, isGeneratedAlt } from "./generated-alt";

/**
 * Every move produces the album's COMPLETE order — the only shape
 * `PATCH /albums/:id/photos/order` accepts.
 */
describe("moveBy — the keyboard path", () => {
  it("swaps with the neighbour and keeps every id exactly once", () => {
    expect(moveBy(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moveBy(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });

  it("answers null for a move that changes nothing, so no write is sent", () => {
    expect(moveBy(["a", "b"], "a", -1)).toBeNull();
    expect(moveBy(["a", "b"], "b", 1)).toBeNull();
    expect(moveBy(["a", "b"], "z", 1)).toBeNull();
  });
});

describe("moveTo — the drag path", () => {
  it("lands after the target when dragged forward and before it when dragged back", () => {
    expect(moveTo(["a", "b", "c", "d"], "a", "c")).toEqual(["b", "c", "a", "d"]);
    expect(moveTo(["a", "b", "c", "d"], "d", "b")).toEqual(["a", "d", "b", "c"]);
  });

  it("answers null for a drop onto itself or an unknown id", () => {
    expect(moveTo(["a", "b"], "a", "a")).toBeNull();
    expect(moveTo(["a", "b"], "a", "z")).toBeNull();
  });
});

describe("the generated fallback", () => {
  const title = { ar: "بطولة الإمارات", en: "UAE Championship" };

  it("numbers the photo in each language's own words, whatever the dashboard's language", () => {
    expect(generatedAltText(title, 3)).toEqual({ ar: "بطولة الإمارات — صورة 3", en: "UAE Championship — Photo 3" });
    expect(generatedCaption(title)).toEqual(title);
  });

  it("is recognised until both languages are rewritten", () => {
    expect(isGeneratedAlt(generatedAltText(title, 12))).toBe(true);
    expect(isGeneratedAlt({ ar: "العدّاءة عند خط النهاية", en: "UAE Championship — Photo 12" })).toBe(true);
    expect(isGeneratedAlt({ ar: "العدّاءة عند خط النهاية", en: "The runner at the finish line" })).toBe(false);
  });
});
