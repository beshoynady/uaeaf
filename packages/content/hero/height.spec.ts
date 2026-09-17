import { describe, expect, it } from "vitest";
import { HEADER_HEIGHT_PX, heroHeight } from "./height";

describe("the first screen (ADR-0078)", () => {
  it("is the screen less the header", () => {
    expect(heroHeight({ width: 1440, height: 900 }, HEADER_HEIGHT_PX)).toBe(804);
    expect(heroHeight({ width: 390, height: 844 }, HEADER_HEIGHT_PX)).toBe(748);
  });

  it("grows to its content where the content needs more, and never clips", () => {
    expect(heroHeight({ width: 844, height: 390 }, HEADER_HEIGHT_PX, 442)).toBe(442);
    expect(heroHeight({ width: 1440, height: 900 }, HEADER_HEIGHT_PX, 400)).toBe(804);
  });

  it("reads the header from the token it is drawn with (`--space-24`)", () => {
    expect(HEADER_HEIGHT_PX).toBe(96);
  });
});
