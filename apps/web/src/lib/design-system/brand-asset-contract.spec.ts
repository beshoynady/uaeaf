import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { themeTokens } from "@uaeaf/design-tokens/testing";

/**
 * The federation mark, enforced mechanically.
 *
 * Three of the identity's colours were wrong in every committed copy of the
 * artwork — `#008542` where Federation Green is `#00843D`, `#c8202f` where
 * Federation Red is `#C8102E`, `#1b1718` where Black is `#000000` — across
 * the logo, the ribbon motif, and both applications' `public/brand`
 * directories. Nobody introduced that deliberately; it is what a design tool
 * exports, and hex in a file has nothing checking it.
 *
 * The federation's guide §9.1 prohibits changing the emblem's colours, and
 * Chapter 1 §Do & Don't prohibits inventing colours that are merely "close"
 * to the official ones. Both are now a failing test rather than a sentence.
 */

// src/lib/design-system -> src/lib -> src -> apps/web -> apps -> repository root.
const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");

/** Every directory in the repository that holds brand artwork. */
const ASSET_DIRS = [
  join(REPO, "apps", "web", "public", "brand"),
  join(REPO, "apps", "dashboard", "public", "brand"),
  join(REPO, "docs", "design-system", "brand-assets"),
].filter(existsSync);

function brandAssets(): { file: string; source: string }[] {
  return ASSET_DIRS.flatMap((dir) =>
    readdirSync(dir)
      .filter((name) => name.endsWith(".svg"))
      .map((name) => ({
        file: relative(REPO, join(dir, name)).split(sep).join("/"),
        source: readFileSync(join(dir, name), "utf-8"),
      })),
  );
}

const ASSETS = brandAssets();

/** The identity palette, read from the token build rather than restated —
 *  the point of the exercise is that there is one source for these values. */
const tokens = themeTokens("light");
const OFFICIAL = new Set(
  [
    tokens["--color-brand-primary"],
    tokens["--color-brand-secondary"],
    tokens["--color-brand-black"],
    tokens["--color-brand-white"],
  ].map((hex) => hex.toUpperCase()),
);

function expand(hex: string): string {
  const raw = hex.replace(/^#/, "");
  const full = raw.length === 3 ? [...raw].map((c) => c + c).join("") : raw;
  return `#${full.toUpperCase()}`;
}

describe("brand assets", () => {
  it("finds the committed artwork, so the rules below cannot pass vacuously", () => {
    expect(ASSETS.length).toBeGreaterThanOrEqual(3);
  });

  it("uses only the federation's own colours", () => {
    // Colour-bearing attributes only. A bare `#…` search also matches the
    // fragment in `url(#216_4)` — SVG exporters name gradient and clip ids
    // numerically — which would report path plumbing as a palette violation.
    const COLOUR_ATTRS = /(?:fill|stroke|stop-color|flood-color|lighting-color)="([^"]*)"/g;
    const offenders: string[] = [];
    for (const { file, source } of ASSETS) {
      for (const [, value] of source.matchAll(COLOUR_ATTRS)) {
        if (!value.startsWith("#")) continue;
        if (!OFFICIAL.has(expand(value))) offenders.push(`${file}: ${value}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("never lets the mark stretch", () => {
    // Guide §9.1, first prohibition. `preserveAspectRatio="none"` is the one
    // attribute that makes stretching the *default* behaviour rather than a
    // mistake someone has to make.
    const offenders = ASSETS.filter(({ source }) => /preserveAspectRatio\s*=\s*"none"/.test(source)).map(
      ({ file }) => file,
    );
    expect(offenders).toEqual([]);
  });

  it("gives every inline path real geometry", () => {
    // The mark shipped with `d="Vector"` on all nine paths — an attribute
    // regex that accepted the `d="` at the tail of `id="`. Nothing caught it:
    // types passed, the build passed, the suite passed, and the logo rendered
    // as nothing at all while Chrome logged nine parse errors per page. Only
    // opening the page in a browser found it.
    //
    // Every SVG path begins with a moveto, so the check is exact: a `d` that
    // does not start with `M` or `m` is not path data.
    const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "components", "brand");
    const offenders: string[] = [];

    for (const name of readdirSync(dir).filter((file) => file.endsWith(".tsx"))) {
      const source = readFileSync(join(dir, name), "utf-8");
      const paths = [...source.matchAll(/\sd="([^"]+)"/g)];
      expect(paths.length, `${name} declares no paths`).toBeGreaterThan(0);
      for (const [, data] of paths) {
        if (!/^[Mm]/.test(data.trim())) offenders.push(`${name}: d="${data.slice(0, 24)}…"`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("binds every fill in the inline brand components to a token", () => {
    // The components are the ones that can be recoloured by a stylesheet, so
    // they are where a raw hex would do the most damage.
    const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "components", "brand");
    const components = readdirSync(dir).filter((name) => name.endsWith(".tsx"));
    expect(components.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const name of components) {
      const source = readFileSync(join(dir, name), "utf-8");
      for (const [, fill] of source.matchAll(/fill=(?:"([^"]*)"|\{([^}]*)\})/g)) {
        const value = fill ?? "";
        if (/#[0-9a-fA-F]{3}/.test(value)) offenders.push(`${name}: raw hex in fill`);
      }
      for (const [match] of source.matchAll(/fill=\{[^}]*\}/g)) {
        if (!/var\(--color-brand-|currentColor/.test(match)) {
          offenders.push(`${name}: ${match}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
