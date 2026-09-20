import { describe, expect, it } from "vitest";
import { MOTION_KEYS, motionIsOff, motionOffAttribute } from "./switches";

describe("the motion off switches", () => {
  it("writes no attribute when nothing is switched off, so the page is exactly as it was", () => {
    expect(motionOffAttribute(undefined)).toBeUndefined();
    expect(motionOffAttribute("")).toBeUndefined();
    expect(motionOffAttribute(" , ")).toBeUndefined();
  });

  it("writes the keys as separate words, the form `[data-motion-off~=…]` matches", () => {
    expect(motionOffAttribute("press")).toBe("press");
    expect(motionOffAttribute("press, hero")).toBe("press hero");
    expect(motionOffAttribute("hero,press")).toBe("hero press");
  });

  it("switches everything off with one word", () => {
    expect(motionOffAttribute("all")).toBe(MOTION_KEYS.join(" "));
  });

  it("drops a word it does not know rather than printing it into the page", () => {
    expect(motionOffAttribute("press,<script>,nonsense")).toBe("press");
    expect(motionOffAttribute("nonsense")).toBeUndefined();
  });

  it("has one key per item of the batch, and no more", () => {
    expect([...MOTION_KEYS]).toEqual(["press", "hero", "seam", "rise", "route"]);
  });

  it("answers for one key, for a server component that renders a motion or does not", () => {
    expect(motionIsOff("seam", undefined)).toBe(false);
    expect(motionIsOff("seam", "press")).toBe(false);
    expect(motionIsOff("seam", "press, seam")).toBe(true);
    expect(motionIsOff("seam", "all")).toBe(true);
  });
});
