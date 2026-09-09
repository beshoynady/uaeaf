import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AA_NORMAL_TEXT, contrastRatio, stripComments, themeTokens } from "@uaeaf/design-tokens/testing";

/**
 * ADR-0065 — the colour role table and the categorical scale.
 *
 * Two rules are enforced here. R2 ("no colour for decoration") is the one
 * with a mechanical signature: a gradient between two steps of a single ramp.
 * That pattern cannot carry information — a card is not "lighter green" than
 * its neighbour in any sense a reader can decode — and it is what made the
 * contact page 98.8 % green by chroma while still being only 8.3 % green by
 * area.
 *
 * D3a is enforced by measurement rather than by value: the scale has to stay
 * separable for a dichromat, not merely stay the colours someone typed.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "..");

const CATEGORY_SCALE = [
  "--color-category-1",
  "--color-category-2",
  "--color-category-3",
  "--color-category-4",
  "--color-category-5",
] as const;

const WHITE = "#FFFFFF";

/** The floor is set below the measured 19.6 so a real regression fails while
 *  a rounding difference does not. Anything under ~15 stops being reliably
 *  separable at badge size. */
const MIN_DELTA_E = 15;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function lab(hex: string): [number, number, number] {
  const [r, g, b] = rgb(hex).map(linear);
  const x = 0.4124 * r + 0.3576 * g + 0.1805 * b;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const [fx, fy, fz] = [f(x / 0.95047), f(y), f(z / 1.08883)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Viénot 1999 dichromat simulation — the same model used to derive the scale. */
function simulate(hex: string, kind: "deuteranopia" | "protanopia"): string {
  const [r, g, b] = rgb(hex).map(linear);
  let L = 17.8824 * r + 43.5161 * g + 4.11935 * b;
  let M = 3.45565 * r + 27.1554 * g + 3.86714 * b;
  const S = 0.0299566 * r + 0.184309 * g + 1.46709 * b;
  if (kind === "deuteranopia") M = 0.494207 * L + 1.24827 * S;
  else L = 2.02344 * M - 2.52581 * S;
  const out = [
    0.080944 * L - 0.130504 * M + 0.116721 * S,
    -0.0102485 * L + 0.0540194 * M - 0.113615 * S,
    -0.000365294 * L - 0.00412163 * M + 0.693513 * S,
  ];
  const encode = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    const s = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(255 * s)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${out.map(encode).join("")}`;
}

function deltaE(a: string, b: string): number {
  const [la, aa, ba] = lab(a);
  const [lb, ab, bb] = lab(b);
  return Math.hypot(la - lb, aa - ab, ba - bb);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return entry.endsWith(".tsx") && !entry.includes(".test.") ? [full] : [];
  });
}

describe("ADR-0065 D3a — the categorical scale", () => {
  const tokens = themeTokens("light");

  it("declares exactly five steps", () => {
    for (const name of CATEGORY_SCALE) {
      expect(tokens[name], `${name} is not declared`).toBeTruthy();
    }
    expect(tokens["--color-category-6"]).toBeUndefined();
  });

  it.each(CATEGORY_SCALE)("carries white text on %s", (name) => {
    expect(contrastRatio(WHITE, tokens[name])).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("stays separable for normal, deuteranopic and protanopic vision", () => {
    const failures: string[] = [];
    for (let i = 0; i < CATEGORY_SCALE.length; i += 1) {
      for (let j = i + 1; j < CATEGORY_SCALE.length; j += 1) {
        const a = tokens[CATEGORY_SCALE[i]];
        const b = tokens[CATEGORY_SCALE[j]];
        const measured = {
          normal: deltaE(a, b),
          deuteranopia: deltaE(simulate(a, "deuteranopia"), simulate(b, "deuteranopia")),
          protanopia: deltaE(simulate(a, "protanopia"), simulate(b, "protanopia")),
        };
        for (const [vision, value] of Object.entries(measured)) {
          if (value < MIN_DELTA_E) {
            failures.push(
              `${CATEGORY_SCALE[i]} ↔ ${CATEGORY_SCALE[j]} under ${vision}: ΔE ${value.toFixed(1)}`,
            );
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("spends neither identity colour on a category", () => {
    // D3a: the derivation excluded green and red on its own, and the role
    // table is what keeps them excluded. A category that borrowed Federation
    // Green would collide with the action role everywhere it appeared.
    const identity = [tokens["--color-brand-primary"], tokens["--color-brand-secondary"]].map((v) =>
      v.toUpperCase(),
    );
    for (const name of CATEGORY_SCALE) {
      expect(identity).not.toContain(tokens[name].toUpperCase());
    }
  });
});

describe("ADR-0065 R2 — no colour for decoration", () => {
  const files = sourceFiles(join(SRC, "components"));

  it("scans the component tree", () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it("paints no gradient between two steps of one ramp", () => {
    // A single-ramp gradient is decoration by construction: both stops mean
    // the same thing, so the difference between them encodes nothing.
    const offenders: string[] = [];
    for (const file of files) {
      const source = stripComments(readFileSync(file, "utf-8"));
      for (const [gradient] of source.matchAll(/linear-gradient\([^()]*(?:\([^()]*\)[^()]*)*\)/g)) {
        const ramps = [...gradient.matchAll(/--color-([a-z-]+?)-\d{2,3}\b/g)].map(([, ramp]) => ramp);
        if (ramps.length >= 2 && new Set(ramps).size === 1) {
          offenders.push(`${file.replace(SRC, "src").split("\\").join("/")}: ${ramps[0]} ramp`);
        }
      }
    }
    expect([...new Set(offenders)]).toEqual([]);
  });
});
