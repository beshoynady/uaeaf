import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The homepage hero switches from its no-JavaScript track (a horizontal
 * scroller) to the stage without a layout shift.
 *
 * Measured on the production build, 2026-09-17: nothing changed size, yet Chrome
 * recorded CLS 0.1008 at 390 and 0.0596 at 1440 at the moment `data-enhanced`
 * landed, above Chapter 5 §5.9's 0.1 at 390. The track stopped being a scroll
 * container (`overflow-x: auto` became `overflow: clip`), and the Layout
 * Instability API counts that as the whole track moving. Tested by elimination:
 * keeping the same overflow type took the shift to zero; `overflow: visible`
 * made it 0.8191.
 *
 * So the rule: before and after enhancement the track is the same kind of box,
 * a scroll container in both.
 */
const MOTION = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "styles", "motion.css");

const block = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`no rule for ${selector}`);
  return match[1];
};

/** Whether a declaration block makes its box a scroll container. */
const scrollContainer = (declarations: string): boolean => {
  const values = [...declarations.matchAll(/overflow(?:-x|-y)?\s*:\s*([\w-]+(?:\s+[\w-]+)?)/g)].flatMap((m) => m[1].split(/\s+/));
  return values.some((value) => value === "auto" || value === "scroll" || value === "hidden");
};

describe("the hero track keeps its box type when the stage switches on", () => {
  const css = readFileSync(MOTION, "utf8").replace(/\r\n/g, "\n");

  it("reads a scroll container and a clipped box apart", () => {
    expect(scrollContainer("overflow-x: auto;")).toBe(true);
    expect(scrollContainer("overflow: clip;")).toBe(false);
    expect(scrollContainer("overflow-x: auto; overflow-y: hidden;")).toBe(true);
  });

  it("is a scroll container both without JavaScript and as the stage", () => {
    expect(scrollContainer(block(css, ".hero-track"))).toBe(true);
    expect(scrollContainer(block(css, ".hero-track[data-enhanced]"))).toBe(true);
  });
});
