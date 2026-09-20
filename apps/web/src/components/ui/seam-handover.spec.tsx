import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MotionProvider } from "./motion-provider";
import { SeamHandover, coverOffset } from "./seam-handover";

/**
 * The handover at a seam (ADR-0087 D8): a cover in the colour of the ground
 * above slides off the band's top padding as the seam enters the view, behind
 * a 45° edge. What is held here is what makes it safe: at rest it draws
 * nothing, so every way of not running it is the band as it always was.
 */

const reduced = vi.hoisted(() => ({ value: false }));
vi.mock("motion/react", async (original) => ({
  ...(await original<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

afterEach(() => {
  reduced.value = false;
});

describe("how far the cover is pulled back over the strip", () => {
  it("lies over the strip while the seam is at the foot of the screen, against the way it leaves", () => {
    expect(coverOffset(0, 900, 128, "ltr")).toBe("-100%");
    expect(coverOffset(0, 900, 128, "rtl")).toBe("100%");
  });

  it("is half way back after half the distance", () => {
    expect(coverOffset(64 / 900, 900, 128, "ltr")).toBe("-50%");
    expect(coverOffset(64 / 900, 900, 128, "rtl")).toBe("50%");
  });

  it("is at rest, `0%`, after the distance, and stays there however far the page goes", () => {
    expect(coverOffset(128 / 900, 900, 128, "ltr")).toBe("0%");
    expect(coverOffset(1, 900, 128, "ltr")).toBe("0%");
    expect(coverOffset(1, 900, 128, "rtl")).toBe("0%");
  });

  it("is at rest when the distance cannot be read: not knowing is never a reason to cover a band", () => {
    expect(coverOffset(0, 900, 0, "ltr")).toBe("0%");
    expect(coverOffset(0, 900, Number.NaN, "rtl")).toBe("0%");
  });

  it("never prints a negative zero, which would be a different string from rest", () => {
    for (const direction of ["ltr", "rtl"] as const) expect(coverOffset(1, 900, 128, direction)).not.toContain("-0");
  });
});

describe("the handover's markup", () => {
  const cover = (container: HTMLElement) => container.querySelector<HTMLElement>(".seam-cover");

  it("is decoration: hidden from assistive technology and from the pointer", () => {
    const { container } = render(
      <MotionProvider>
        <SeamHandover direction="rtl" />
      </MotionProvider>,
    );
    const strip = container.querySelector<HTMLElement>("[data-seam-handover]");
    expect(strip?.getAttribute("aria-hidden")).toBe("true");
    expect(strip?.className).toContain("pointer-events-none");
  });

  it("lays the cover out beside the strip, off its end, so rest needs no transform at all", () => {
    const { container } = render(
      <MotionProvider>
        <SeamHandover direction="ltr" />
      </MotionProvider>,
    );
    // `start-full` is the whole of rest: the cover's start edge on the strip's
    // end edge, clipped away by the strip.
    expect(cover(container)?.className.split(" ")).toContain("start-full");
    expect(container.querySelector("[data-seam-handover]")?.className.split(" ")).toContain("overflow-clip");
  });

  it("leaves the server's HTML at rest: no inline transform, so the layout's resting place applies", () => {
    const html = renderToString(
      <MotionProvider>
        <SeamHandover direction="ltr" />
      </MotionProvider>,
    );
    expect(html).toContain("seam-cover");
    expect(html).not.toMatch(/style="[^"]*transform/);
  });

  // Found 2026-09-20, when the homepage answered 500: the library runs the
  // transform's callback while the component renders, on the server too, and
  // the callback read `window`. Every other test here runs under jsdom, which
  // always has one, so none of them could see it. This one takes it away.
  it("renders on the server, where there is no window, without reading one", () => {
    vi.stubGlobal("window", undefined);
    vi.stubGlobal("document", undefined);
    try {
      const html = renderToString(
        <MotionProvider>
          <SeamHandover direction="rtl" />
        </MotionProvider>,
      );
      expect(html).toContain("seam-cover");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("never moves for a reader who asked for less motion", () => {
    reduced.value = true;
    const { container } = render(
      <MotionProvider>
        <SeamHandover direction="ltr" />
      </MotionProvider>,
    );
    expect(cover(container)?.style.transform ?? "").toBe("");
  });
});

describe("the handover's resting rules", () => {
  const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "styles", "motion.css"), "utf-8").replace(
    /\/\*[\s\S]*?\*\//g,
    (block) => block.replace(/[^\n]/g, " "),
  );

  /** The declarations of the rule whose selector is exactly this, found by its
   *  own line: a pattern built from a selector needs escapes that did not
   *  survive being written, and a broken pattern matches nothing in silence. */
  const body = (selector: string): string => {
    const all = css.split(/\r?\n/);
    const at = all.findIndex((line) => line.trim() === `${selector} {`);
    if (at < 0) return "";
    const rest = all.slice(at + 1);
    return rest.slice(0, rest.findIndex((line) => line.trim() === "}")).join(" ");
  };

  it("finds the rules it reads, so the checks below cannot pass on nothing", () => {
    expect(body(".seam-cover")).not.toBe("");
    expect(body('[dir="rtl"] .seam-cover')).not.toBe("");
    expect(body(".seam-handover")).not.toBe("");
  });

  it("gives the cover no transform of its own: rest is where it is laid out, and there is one rest", () => {
    // A resting transform in the stylesheet and a resting layout would be two
    // answers to one question, and the library writes no inline transform for
    // its default value, so the stylesheet's would win at exactly the moment
    // the cover should be covering.
    expect(body(".seam-cover")).not.toContain("transform");
    expect(body('[dir="rtl"] .seam-cover')).not.toContain("transform");
  });

  it("cuts its edge at 45 degrees with a shape that never changes: the run equals the rise", () => {
    expect(body(".seam-cover")).toContain("clip-path: polygon(var(--seam-h) 0, 100% 0, 100% 100%, 0 100%)");
    expect(body('[dir="rtl"] .seam-cover')).toContain("clip-path: polygon(0 0, 100% 0, calc(100% - var(--seam-h)) 100%, 0 100%)");
    // The shape is declared, never animated (ADR-0009).
    for (const [, frames] of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)) expect(frames).not.toContain("clip-path");
  });

  it("is as tall as the band's own top padding at every width: 48, 64 and 96px", () => {
    expect(body(".seam-handover")).toContain("--seam-h: var(--space-12)");
    expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.seam-handover \{\s*--seam-h: var\(--space-16\);/);
    expect(css).toMatch(/@media \(min-width: 1024px\) \{\s*\.seam-handover \{\s*--seam-h: var\(--space-24\);/);
  });

  it("is not drawn in high contrast or under forced colours, where a band's edge is a drawn line it would paint over", () => {
    expect(css).toMatch(/\[data-theme="high-contrast"\]\s+\.seam-handover\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/@media\s*\(forced-colors:\s*active\)\s*\{\s*\.seam-handover\s*\{[^}]*display:\s*none/);
  });
});
