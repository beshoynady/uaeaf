import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AA_LARGE_TEXT_OR_NON_TEXT,
  AA_NORMAL_TEXT,
  contrastRatio,
  stripComments,
} from "@uaeaf/design-tokens/testing";
import { COVER_SCRIM_MIN } from "@uaeaf/content/hero";

/**
 * `PageHero`'s photographic composition and its entrance — the guard the kit's
 * own stylesheets do not otherwise have.
 *
 * ── Why this file exists ───────────────────────────────────────────────────
 *
 * Every motion and colour rule on this site is enforced by a spec that walks
 * source text, and **none of them reaches `packages/brand-ui/*.css`**:
 * `motion-contract.spec.ts` walks `apps/web/src` plus
 * `packages/design-tokens/css`, and `token-contract.spec.ts` walks `apps/web/src`
 * alone. `source-files.ts` does add `packages/brand-ui` — but only its `.tsx`.
 * So the kit's stylesheets sit outside the keyframe whitelist, outside the
 * duration-token rule and outside the hex rule, which is how
 * `accent/accent.css` came to animate a custom property that
 * `motion-contract.spec.ts:120` would have rejected.
 *
 * This spec closes that gap for the one stylesheet this change adds. It is
 * deliberately not a general brand-ui CSS walker: extending the existing guards
 * to the whole package would fail on rules written before the gap was known,
 * and turning a green suite red on files nobody is touching is how a guard gets
 * disabled rather than fixed. The gap is recorded in `page-hero.md` for the
 * pass that closes it properly.
 *
 * ── What is asserted ──────────────────────────────────────────────────────
 *
 * 1. The entrance animates `transform` and `opacity` only (ADR-0009).
 * 2. White text over the weakest scrim stop clears AA above a pure white
 *    picture — the worst admissible ground, which is how every other scrim on
 *    this site is solved.
 * 3. Neither stop drifts below `COVER_SCRIM_MIN`, the measured floor this
 *    package cannot import.
 * 4. Nothing runs outside `prefers-reduced-motion: no-preference`.
 * 5. The heading is masked over a photograph and never on the band, because a
 *    masked heading is as late to the largest contentful paint as an
 *    `opacity: 0` one and on the band the heading *is* that paint.
 */

const CSS = readFileSync(
  join(import.meta.dirname, "..", "..", "..", "..", "..", "packages", "brand-ui", "content", "page-hero.css"),
  "utf8",
);

/** Comments blanked to equal-length whitespace, so an offset in the stripped
 *  text is still the offset in the original. The shared helper rather than a
 *  fourth local copy: it exists because the guards that each rolled their own
 *  ended up reporting their own prose as a violation. */
const SOURCE = stripComments(CSS);

/** ADR-0009: the two properties that never force layout. `translate`, `scale`
 *  and `rotate` are the individual forms of the first. */
const ALLOWED = new Set(["transform", "opacity", "translate", "scale", "rotate", "transform-origin"]);

const NO_PREFERENCE = /@media[^{]*prefers-reduced-motion:\s*no-preference[^{]*\{/g;

/** The character ranges covered by a `no-preference` block, by brace depth. */
const guardedRanges = (): readonly [number, number][] => {
  const ranges: [number, number][] = [];
  for (const open of SOURCE.matchAll(NO_PREFERENCE)) {
    let depth = 0;
    let index = open.index + open[0].length - 1;
    for (; index < SOURCE.length; index += 1) {
      if (SOURCE[index] === "{") depth += 1;
      if (SOURCE[index] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    ranges.push([open.index, index]);
  }
  return ranges;
};

const GUARDED = guardedRanges();

const isGuarded = (offset: number): boolean =>
  GUARDED.some(([from, to]) => offset > from && offset < to);

describe("PageHero's photographic composition", () => {
  it("has a stylesheet to examine", () => {
    // Non-vacuity. Every assertion below reads `SOURCE`, and a renamed or moved
    // file would make all of them pass on an empty string.
    expect(SOURCE.length).toBeGreaterThan(2000);
    expect(SOURCE).toContain(".brand-page-hero--photo");
  });

  it("animates transform and opacity only", () => {
    const offenders: string[] = [];
    for (const block of SOURCE.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
      for (const [, property] of block[2].matchAll(/^\s*([a-z-]+)\s*:/gm)) {
        if (!ALLOWED.has(property)) offenders.push(`@keyframes ${block[1]} animates "${property}"`);
      }
    }
    // The brief asked for `filter: brightness()` and `clip-path`; both were
    // expressed as an `opacity` plane and a clip box with an inner `translate`
    // instead. This is what holds that decision in place.
    expect(offenders).toEqual([]);
  });

  it("declares at least one keyframe set, so the rule above is not vacuous", () => {
    expect([...SOURCE.matchAll(/@keyframes\s+([\w-]+)/g)].map((match) => match[1]).sort()).toEqual([
      "brand-hero-draw",
      "brand-hero-expose",
      "brand-hero-ground",
      "brand-hero-rise",
      "brand-hero-unmask",
    ]);
  });

  it("runs no animation outside a no-preference guard", () => {
    const offenders: string[] = [];
    for (const match of SOURCE.matchAll(/^\s*animation(?:-delay)?\s*:/gm)) {
      if (!isGuarded(match.index)) offenders.push(`animation at offset ${match.index} is outside the guard`);
    }
    expect(offenders).toEqual([]);
    expect(GUARDED.length).toBeGreaterThan(0);
  });

  it("answers the site's hero off switch", () => {
    // `UAEAF_MOTION_OFF=hero` turns the homepage's opening off without a build
    // (`lib/motion/switches.ts`). An entrance that ignored it would be a second
    // mechanism for one decision.
    expect(SOURCE).toContain(':root:not([data-motion-off~="hero"])');
  });

  /**
   * The selector of the rule a declaration sits in.
   *
   * Walked rather than matched with a line-anchored regex, because a selector
   * here is written across four lines and `^[^\n{]*` silently matches nothing
   * against one — a guard that reports green on an empty set, which is the
   * failure this whole file exists to avoid.
   */
  const selectorOf = (needle: string): string[] =>
    [...SOURCE.matchAll(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))].map(
      ({ index }) => {
        // The declaration's own block opens at the last `{` before it; the
        // selector is what stands between that and the boundary before it.
        const opens = SOURCE.lastIndexOf("{", index);
        const before = Math.max(SOURCE.lastIndexOf("}", opens), SOURCE.lastIndexOf("{", opens - 1));
        return SOURCE.slice(before + 1, opens);
      },
    );

  it("masks the heading over a photograph and never on the ink band", () => {
    // The clip box, and the keyframe that moves the line out of it. On the band
    // the heading is the largest contentful paint, and a clip box delays it
    // exactly as `opacity: 0` would.
    const clipBox = [...SOURCE.matchAll(/^[^\n{]*\.brand-page-hero__reveal[^\n{]*\{/gm)].map((m) => m[0]);
    expect(clipBox.length).toBeGreaterThan(0);
    for (const rule of clipBox) expect(rule).toContain(".brand-page-hero--photo");

    // The mask must name the clip box as well as the composition.
    // `translateY(105%)` on an element with nothing clipping it is not a reveal:
    // it starts a line below where it belongs and slides up over what is beneath
    // it, which is what the breadcrumb did until it was measured.
    const unmask = selectorOf("brand-hero-unmask;");
    expect(unmask.length).toBeGreaterThan(0);
    for (const rule of unmask) {
      expect(rule).toContain(".brand-page-hero--photo");
      expect(rule).toContain(".brand-page-hero__reveal");
    }
  });

  it("gives the ground no opacity to fade in from", () => {
    const ground = SOURCE.match(/@keyframes brand-hero-ground\s*\{([\s\S]*?)\n\}/)![1];
    // A hero photograph is the largest contentful paint, and an element at
    // `opacity: 0` is not counted as painted: fading it in postpones LCP by the
    // length of the fade. Only its scale may move.
    expect(ground).not.toMatch(/opacity/);
    expect(ground).toMatch(/scale/);
  });

  it("gives every line the display a transform can act on", () => {
    /*
      The regression this exists for, and it shipped once.

      A transform does not apply to a non-replaced inline box. The line is a
      `<span>` inside the heading, so with the span left `display: inline` the
      browser attached the animation, reported it as running, and moved nothing:
      measured on /ar/news, the heading's computed transform was the identity
      matrix at frame 0 while `getAnimations()` named `brand-hero-unmask`. Both
      the mask and the rise were silently absent, and the hero looked finished.

      Nothing else in the suite would have caught it — the keyframes are valid,
      the guard wrapper is correct, and the animation exists.
    */
    const line = SOURCE.match(/\.brand-page-hero__line \{([\s\S]*?)\n  \}/)![1];
    expect(line).toMatch(/display:\s*(block|inline-block|flow-root)/);
  });

  it("never starts a text line at exactly zero opacity", () => {
    const rise = SOURCE.match(/@keyframes brand-hero-rise\s*\{([\s\S]*?)\n\}/)![1];
    const from = rise.match(/from\s*\{([\s\S]*?)\}/)![1];
    const opacity = Number(from.match(/opacity:\s*([\d.]+)/)![1]);
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThan(0.05);
  });
});

describe("the photographic scrim", () => {
  /** The two stops of the photographic scrim, as percentages of the overlay
   *  role, parsed from what the stylesheet actually declares — re-typing them
   *  here would measure the file against itself. */
  const STOPS = (() => {
    const rule = SOURCE.match(
      /\.brand-page-hero--photo \.brand-page-hero__media::after \{([\s\S]*?)\n\}/,
    )![1];
    return [...rule.matchAll(/var\(--color-surface-overlay\)\s+(\d+(?:\.\d+)?)%/g)].map((match) =>
      Number(match[1]),
    );
  })();

  /**
   * The same two stops in `HERO_SCRIM`, the application's own hero wash.
   *
   * "Shared by every hero that can carry an image so the guarantee is the same
   * one everywhere, rather than re-derived per page and wrong on the twelfth" is
   * that constant's own stated reason (`ui/surface.ts`). This package cannot
   * import it, so the two are tied here instead: without this, either could move
   * and both suites would stay green while the listing heroes and the contact and
   * institutional heroes stood on different washes.
   *
   * The separator is `_` because the constant is a Tailwind arbitrary value,
   * where a space would end the class.
   */
  const HERO_SCRIM_STOPS = [
    ...readFileSync(
      join(import.meta.dirname, "..", "..", "components", "ui", "surface.ts"),
      "utf8",
    ).matchAll(/var\(--color-surface-overlay\)_(\d+(?:\.\d+)?)%/g),
  ].map((match) => Number(match[1]));

  /** The lightest ground a photograph can present. Nothing renders brighter, so
   *  a wash that carries white text over white carries it over any picture an
   *  editor uploads — which takes the photograph out of the question entirely. */
  const WORST_CASE_IMAGE = "#ffffff";

  /** The overlay role, in every theme (ADR-0071 D5). */
  const OVERLAY = "#000000";

  /**
   * `color-mix(in srgb, #000 N%, transparent)` over a ground, as the browser
   * composites it.
   *
   * In sRGB channel space and never in luminance space: blending two luminances
   * gives a different — and wrong — answer than blending the channels and taking
   * the luminance of the result. The same helper as `cover-scrim.spec.ts`, for
   * the same reason.
   */
  const composite = (percent: number, ground: string): string => {
    const alpha = percent / 100;
    const channel = (offset: number) => {
      const over = Number.parseInt(OVERLAY.slice(1 + offset * 2, 3 + offset * 2), 16);
      const under = Number.parseInt(ground.slice(1 + offset * 2, 3 + offset * 2), 16);
      return Math.round(over * alpha + under * (1 - alpha));
    };
    return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, "0")).join("")}`;
  };

  it("declares two stops", () => {
    expect(STOPS).toHaveLength(2);
  });

  it("stands on the same wash as every other hero on the site", () => {
    expect(HERO_SCRIM_STOPS.length).toBeGreaterThan(0);
    expect(STOPS).toEqual(HERO_SCRIM_STOPS);
  });

  it("holds white text to AA over the lightest admissible picture", () => {
    for (const stop of STOPS) {
      const ground = composite(stop, WORST_CASE_IMAGE);
      expect(contrastRatio("#ffffff", ground)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      expect(contrastRatio("#ffffff", ground)).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
    }
  });

  it("holds the subtitle's 85% white to AA over the weakest stop", () => {
    // The second text tier is white at 85% (`page-hero.css`). Its effective
    // colour is white composited over the scrimmed ground at that alpha, which
    // is the value a reader actually sees — not white.
    const ground = composite(Math.min(...STOPS), WORST_CASE_IMAGE);
    const channel = Number.parseInt(ground.slice(1, 3), 16);
    const tier = Math.round(255 * 0.85 + channel * 0.15);
    const hex = `#${tier.toString(16).padStart(2, "0").repeat(3)}`;
    expect(contrastRatio(hex, ground)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("never drifts below the measured floor", () => {
    // `COVER_SCRIM_MIN` is the floor `cover-scrim.spec.ts` re-measures on every
    // build. `packages/brand-ui` has no dependency beyond React and cannot
    // import it, so the two stops are written out there and tied to it here.
    expect(Math.min(...STOPS)).toBeGreaterThanOrEqual(COVER_SCRIM_MIN);
  });
});
