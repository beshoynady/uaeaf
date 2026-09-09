import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AA_NORMAL_TEXT, contrastRatio, themeTokens } from "@uaeaf/design-tokens/testing";

/**
 * The contact cards, measured against the worst photograph an editor can set.
 *
 * The cards sit on a hero band whose ground is not a token: it is an uploaded
 * image under a fixed black overlay, with the card's own translucent panel on
 * top. Nothing in that stack follows the theme, so nothing painted on it may
 * either — and the ratio the visitor actually sees depends on a picture the
 * design system never gets to see.
 *
 * So the test composites the stack the way the browser does and takes the
 * worst admissible input: a pure white image. If white card text clears AA
 * against that, it clears AA against every darker photograph as well.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERO = join(SRC, "components", "pages", "contact", "contact-hero.tsx");

const source = readFileSync(HERO, "utf-8");

/** The declaration a named constant holds, so the overlay and the card panel
 *  are read as the separate layers they are rather than as one soup of alpha
 *  values. */
function declaration(name: string): string {
  const start = source.indexOf(`const ${name} =`);
  expect(start, `${name} is gone — this probe is measuring nothing`).toBeGreaterThan(-1);
  return source.slice(start, source.indexOf(";", start));
}

/** The translucent grounds a declaration paints — `bg-[rgb(255_255_255/0.12)]`
 *  in Tailwind's arbitrary-value spelling, underscores standing in for spaces.
 *  Only `bg-`: a `border-` of the same syntax is an edge, not a layer the text
 *  sits on, and compositing it as one understates the ratio. */
function layers(name: string): { level: number; alpha: number }[] {
  const grounds = [...declaration(name).matchAll(/bg-\[([^\]]*)\]/g)].map(([, body]) => body);
  return grounds.flatMap((body) =>
    [...body.matchAll(/rgb\((\d+)_\d+_\d+\/([\d.]+)\)/g)].map((match) => ({
      level: Number(match[1]),
      alpha: Number(match[2]),
    })),
  );
}

/** Source-over compositing of an opaque grey `over` a backdrop, both 0–255. */
const composite = (top: number, alpha: number, backdrop: number) =>
  top * alpha + backdrop * (1 - alpha);

const grey = (v: number) => {
  const hex = Math.round(Math.max(0, Math.min(255, v)))
    .toString(16)
    .padStart(2, "0");
  return `#${hex}${hex}${hex}`;
};

describe("contact hero cards", () => {
  it("paints the cards with no ramp colour at all", () => {
    // ADR-0065 R2. Four cards separated by four steps of one ramp encoded
    // nothing; the replacement must not quietly reintroduce a hue.
    const cardBlock = source.slice(source.indexOf("const CARD ="), source.indexOf("export async"));
    expect(cardBlock).not.toMatch(/--color-(green|red|steel-blue|teal|desert-sand|gold)-\d/);
  });

  it("labels the cards with the theme-independent white", () => {
    // `--color-text-on-brand`, never `--color-text-inverse`: the second flips
    // to black in the dark theme, and this ground does not flip with it.
    expect(source).toContain("--color-text-on-brand");
    expect(source).not.toContain("--color-text-inverse");
  });

  it("keeps white card text above AA over the worst admissible photograph", () => {
    const overlay = layers("HERO_OVERLAY");
    const panel = layers("CARD");
    expect(overlay.length, "the hero overlay declares no translucent stop").toBeGreaterThan(0);
    expect(panel.length, "the card panel declares no translucent ground").toBeGreaterThan(0);

    const white = themeTokens("light")["--color-text-on-brand"];

    // The two layers are one decision. Every combination of overlay stop and
    // card ground has to hold, because the gradient means the cards do not sit
    // at a single point on it — and the photograph beneath is the worst
    // admissible input, a pure white image.
    for (const stop of overlay) {
      for (const card of panel) {
        const band = composite(stop.level, stop.alpha, 255);
        const ground = composite(card.level, card.alpha, band);
        expect(
          contrastRatio(white, grey(ground)),
          `overlay ${stop.alpha} + card ${card.alpha} over a white photograph`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      }
    }
  });

  it("leaves the card visible when no photograph is set", () => {
    // The fallback ground is the black register, and a card that composites to
    // the register's own value has no edge at all. WCAG 1.4.11's 3:1 is for
    // controls; this is the weaker requirement that the card be perceivable,
    // so the floor is the card plus its border against the band.
    const panel = layers("CARD");
    const lightest = Math.max(...panel.map((layer) => composite(layer.level, layer.alpha, 0)));
    expect(lightest, "the card panel vanishes into the black register").toBeGreaterThan(20);
  });

  it("holds in every theme, because none of the stack follows the theme", () => {
    for (const theme of ["light", "dark", "high-contrast"] as const) {
      expect(themeTokens(theme)["--color-text-on-brand"].toUpperCase()).toBe("#FFFFFF");
    }
  });
});
