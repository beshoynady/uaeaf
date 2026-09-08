import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { declaredTokens, themeTokens } from "@uaeaf/design-tokens/testing";

/**
 * Motion, enforced mechanically.
 *
 * The identity is called "نقطة الارتقاء / The Rise" (Chapter 1 §2.1): four
 * diagonal strokes reading as ascent. Sixteen motion tokens were built and
 * eleven were never consumed by anything, so the identity's own central idea
 * existed as a static SVG and nowhere else.
 *
 * The rules below are the three that can be checked without a browser and
 * that this project has already got wrong somewhere:
 *
 *  - ADR-0009 permits `transform` and `opacity` only. Anything else forces
 *    layout and cannot hold 60fps.
 *  - Chapter 5 §5.7 bounds the stagger to 40–80ms per step and 600ms total.
 *  - Chapter 5 §5.8 requires every motion to yield to
 *    `prefers-reduced-motion`. A scroll-driven animation is the trap here:
 *    `animation-timeline` ignores `animation-duration`, so the global
 *    duration reset in `base.css` does NOT stop it. It has to be guarded at
 *    the query.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function stylesheets(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return stylesheets(full);
    return entry.endsWith(".css") ? [full] : [];
  });
}

/** Comments are replaced with equal-length whitespace rather than removed, so
 *  every reported offset still points at the real line — and so that prose
 *  *about* a property is never mistaken for a use of it. The guard rule below
 *  reported its own explanatory comment before this existed. */
const CSS = stylesheets(SRC).map((file) => ({
  file: file.replace(SRC, "src"),
  source: readFileSync(file, "utf-8").replace(/\/\*[\s\S]*?\*\//g, (block) =>
    block.replace(/[^\n]/g, " "),
  ),
}));

describe("motion tokens", () => {
  const declared = declaredTokens();
  const light = themeTokens("light");

  it("declares the ascent vector the identity is built on", () => {
    for (const token of [
      "--motion-ascent-angle",
      "--motion-ascent-offset",
      "--motion-ascent-stagger",
      "--motion-ascent-stagger-steps",
    ]) {
      expect(declared, `${token} is not declared by the token build`).toContain(token);
    }
  });

  it("keeps the ascent angle at the measured 45 degrees", () => {
    // ADR-0059 §D7: measured mean of the three full-length strokes is 44.46°,
    // rounded to 45° so the diagonal has an exact 1:1 slope on the pixel grid.
    expect(light["--motion-ascent-angle"]).toBe("45deg");
  });

  it("keeps the offset equal on both axes, which is what makes it 45 degrees", () => {
    // The component translates by (-offset, +offset). Equal magnitudes are the
    // angle: change one and the ascent silently stops being the brand's.
    expect(light["--motion-ascent-offset"]).toBe("16px");
  });

  it("stays inside Chapter 5 §5.7's stagger window", () => {
    const step = Number.parseInt(light["--motion-ascent-stagger"], 10);
    expect(step).toBeGreaterThanOrEqual(40);
    expect(step).toBeLessThanOrEqual(80);
  });

  it("cannot exceed §5.7's 600ms total stagger", () => {
    const step = Number.parseInt(light["--motion-ascent-stagger"], 10);
    const steps = Number.parseInt(light["--motion-ascent-stagger-steps"], 10);
    expect(step * steps).toBeLessThanOrEqual(600);
  });
});

describe("motion implementation", () => {
  it("finds stylesheets to check, so the rules below cannot pass vacuously", () => {
    expect(CSS.length).toBeGreaterThan(0);
  });

  it("animates only transform and opacity (ADR-0009)", () => {
    // Any other property forces the browser to recalculate layout. The ADR
    // names `width`, `top` and `margin`; the check is a whitelist rather than
    // a blacklist so a property nobody thought of cannot slip through.
    const ALLOWED = new Set(["transform", "opacity", "translate", "scale", "rotate"]);
    const offenders: string[] = [];

    for (const { file, source } of CSS) {
      for (const block of source.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)) {
        for (const [, property] of block[1].matchAll(/^\s*([a-z-]+)\s*:/gm)) {
          if (!ALLOWED.has(property)) offenders.push(`${file}: @keyframes animates "${property}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("guards every scroll-driven animation behind prefers-reduced-motion", () => {
    // `animation-timeline: view()` is driven by scroll position, not by a
    // clock, so zeroing `animation-duration` — which is what base.css and the
    // global reset both do — leaves it running at full amplitude for a reader
    // who asked the operating system for no motion.
    const offenders: string[] = [];

    for (const { file, source } of CSS) {
      if (!/animation-timeline/.test(source)) continue;
      const guards = [...source.matchAll(/@media[^{]*prefers-reduced-motion:\s*no-preference[^{]*\{/g)];
      if (guards.length === 0) {
        offenders.push(`${file}: uses animation-timeline with no no-preference guard`);
        continue;
      }
      // Every occurrence must sit after a guard opens and before it closes.
      for (const use of source.matchAll(/animation-timeline/g)) {
        const index = use.index ?? 0;
        const covering = guards.some((guard) => {
          const start = (guard.index ?? 0) + guard[0].length;
          if (index < start) return false;
          let depth = 1;
          for (let i = start; i < source.length; i += 1) {
            if (source[i] === "{") depth += 1;
            else if (source[i] === "}") {
              depth -= 1;
              if (depth === 0) return index < i;
            }
          }
          return false;
        });
        if (!covering) offenders.push(`${file}: animation-timeline at offset ${index} is outside the guard`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("takes every duration from a token, never a literal", () => {
    // One exemption, and it is written into the design system rather than
    // chosen here: Chapter 5 §5.8 prescribes the reduced-motion kill switch
    // *verbatim*, `0.01ms !important` included. Tokenising those two values
    // would be editing a rule, not honouring it — and the block exists to
    // stop motion, so it is not motion.
    const offenders: string[] = [];
    for (const { file, source } of CSS) {
      const exempt = [...source.matchAll(/@media[^{]*prefers-reduced-motion:\s*reduce[^{]*\{/g)].map(
        (match) => {
          const start = (match.index ?? 0) + match[0].length;
          let depth = 1;
          let end = start;
          for (; end < source.length && depth > 0; end += 1) {
            if (source[end] === "{") depth += 1;
            else if (source[end] === "}") depth -= 1;
          }
          return [match.index ?? 0, end] as const;
        },
      );

      for (const match of source.matchAll(/^\s*(?:animation|transition)(?:-duration|-delay)?\s*:[^;]*;/gm)) {
        const index = match.index ?? 0;
        if (exempt.some(([start, end]) => index >= start && index < end)) continue;
        if (/\d+m?s/.test(match[0]) && !/var\(--motion-/.test(match[0])) {
          offenders.push(`${file}: ${match[0].trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
