import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AA_NORMAL_TEXT, AA_LARGE_TEXT_OR_NON_TEXT, contrastRatio, themeTokens } from "@uaeaf/design-tokens/testing";

/**
 * The contact cards, measured on both of the grounds they actually sit on.
 *
 * The cards are one component in two situations, and the earlier version of
 * this file only knew about one of them. From `md` up they are pinned inside
 * the hero band, over a photograph under a fixed dark overlay. Below `md`
 * they leave the band entirely and stack on the page's own surface.
 *
 * Measuring only the first situation is what let white card text ship on a
 * near-white page ground at 1.04:1 — the four contact details, invisible on
 * every phone in the light theme, on the one page whose entire job is to give
 * them. A test that misses the case containing the defect is not a guard, so
 * this file now composites both.
 */

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HERO = join(SRC, "components", "pages", "contact", "contact-hero.tsx");
const SURFACE = join(SRC, "components", "ui", "surface.ts");

const source = readFileSync(HERO, "utf-8");
const surface = readFileSync(SURFACE, "utf-8");

/**
 * The declaration a named constant holds, so the overlay and the card are
 * read as the separate layers they are rather than as one soup of alpha.
 *
 * A recipe interpolated from `ui/surface` is followed through and inlined.
 * The card's border and ground moved into the shared standard, and without
 * this the probe read a declaration with no `border-[…]` in it and reported
 * "declares no border" — a measurement of the wrong text, which is the one
 * failure mode a contrast guard must never have. What it measures has to be
 * what the browser composites, wherever the value is written.
 */
function declaration(name: string, from: string = source): string {
  const start = from.indexOf(`const ${name} =`);
  expect(start, `${name} is gone — this probe is measuring nothing`).toBeGreaterThan(-1);
  const raw = from.slice(start, from.indexOf(";", start));

  return raw.replace(/\$\{(\w+)\}/g, (_, reference: string) => {
    const local = from.indexOf(`const ${reference} =`);
    const body = local > -1 ? declaration(reference, from) : declaration(imported(reference), surface);
    return body.slice(body.indexOf("=") + 1);
  });
}

/** The name a recipe carries inside `ui/surface`, which the hero may have
 *  renamed on import (`CARD as CARD_SURFACE`). */
function imported(alias: string): string {
  const marker = ` as ${alias}`;
  const at = source.indexOf(marker);
  if (at === -1) return alias;
  return source.slice(0, at).trim().split(/[\s,{]+/).pop() ?? alias;
}

/**
 * The classes that apply at one breakpoint.
 *
 * Tailwind's variants are additive, so the card's appearance below `md` is
 * its unprefixed classes alone, and at `md` and above it is those classes
 * with the `md:` ones layered over. Splitting them is the whole point: the
 * two sets paint onto different grounds and have to be measured separately.
 */
function classesAt(name: string, breakpoint: "base" | "md"): string[] {
  const all = declaration(name)
    .split(/["`]/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .filter((token) => token.includes("-["));

  const unprefixed = all.filter((token) => !/^[a-z]{2}:/.test(token));
  if (breakpoint === "base") return unprefixed;

  const md = all.filter((token) => token.startsWith("md:")).map((token) => token.slice(3));
  // A `md:` class overrides its unprefixed counterpart of the same property.
  const overridden = new Set(md.map(property));
  return [...unprefixed.filter((token) => !overridden.has(property(token))), ...md];
}

/** The CSS property a utility sets, so an override can be recognised. */
const property = (token: string) => token.slice(0, token.indexOf("-["));

/** The colour a utility paints, as `{ value, alpha }`. Handles both spellings
 *  the codebase uses: a raw `rgb(r g b / a)` and a `var(--token)` reference. */
function paint(tokens: string[], prefix: string, theme: Parameters<typeof themeTokens>[0]) {
  const token = tokens.find((candidate) => candidate.startsWith(`${prefix}-[`));
  if (!token) return null;

  const body = token.slice(token.indexOf("[") + 1, token.lastIndexOf("]"));

  const literal = body.match(/rgb\((\d+)_(\d+)_(\d+)(?:\/([\d.]+))?\)/);
  if (literal) {
    return {
      rgb: [Number(literal[1]), Number(literal[2]), Number(literal[3])] as const,
      alpha: literal[4] ? Number(literal[4]) : 1,
    };
  }

  const variable = body.match(/var\((--[a-z0-9-]+)\)/);
  if (variable) {
    const hex = themeTokens(theme)[variable[1] as keyof ReturnType<typeof themeTokens>];
    expect(hex, `${variable[1]} is not a token in the ${theme} theme`).toBeTruthy();
    const value = String(hex).replace("#", "");
    const full = value.length === 3 ? [...value].map((c) => c + c).join("") : value;
    return {
      rgb: [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as unknown as readonly number[],
      alpha: 1,
    };
  }
  return null;
}

const over = (top: number, alpha: number, backdrop: number) => top * alpha + backdrop * (1 - alpha);

const hex = (channels: readonly number[]) =>
  `#${channels.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, "0")).join("")}`;

const THEMES = ["light", "dark", "high-contrast"] as const;

describe("contact hero cards", () => {
  it("paints the cards with no ramp colour at all", () => {
    // ADR-0065 R2. Four cards separated by four steps of one ramp encoded
    // nothing; the replacement must not quietly reintroduce a hue.
    const cardBlock = source.slice(source.indexOf("const CARD ="), source.indexOf("export async"));
    expect(cardBlock).not.toMatch(/--color-(green|red|steel-blue|teal|desert-sand|gold)-\d/);
  });

  it("clears AA where the cards stack on the page's own surface", () => {
    // Below `md` the cards are outside the hero band, on `surface-base`.
    // This is the case that shipped at 1.04:1, and it has to hold in every
    // theme — the ground follows the theme here, unlike inside the band.
    const card = classesAt("CARD", "base");

    for (const theme of THEMES) {
      const page = paint([`bg-[color:var(--color-surface-base)]`], "bg", theme)!;
      const panel = paint(card, "bg", theme);
      const text = paint(card, "text", theme);

      expect(text, `the stacked card declares no text colour (${theme})`).toBeTruthy();

      const ground = panel
        ? page.rgb.map((channel, index) => over(panel.rgb[index], panel.alpha, channel))
        : [...page.rgb];

      expect(
        contrastRatio(hex(text!.rgb), hex(ground)),
        `stacked card text on the page surface, ${theme} theme`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it("gives the stacked card a perceivable edge against the page", () => {
    // WCAG 1.4.11: the card is a grouping, and a grouping nothing separates
    // from its ground is not one. The border shipped at 1.02:1.
    const card = classesAt("CARD", "base");

    for (const theme of THEMES) {
      const page = paint([`bg-[color:var(--color-surface-base)]`], "bg", theme)!;
      const border = paint(card, "border", theme);
      expect(border, `the stacked card declares no border (${theme})`).toBeTruthy();

      const edge = page.rgb.map((channel, index) => over(border!.rgb[index], border!.alpha, channel));
      expect(
        contrastRatio(hex(edge), hex(page.rgb)),
        `stacked card border against the page surface, ${theme} theme`,
      ).toBeGreaterThanOrEqual(AA_LARGE_TEXT_OR_NON_TEXT);
    }
  });

  it("keeps white card text above AA over the worst admissible photograph", () => {
    // From `md` up the card is inside the band, and the ground is an uploaded
    // picture under a fixed overlay. Nothing in that stack follows the theme,
    // so the worst admissible input — a pure white image — is the test.
    const overlay = classesAt("HERO_OVERLAY", "base");
    const card = classesAt("CARD", "md");

    const gradient = declaration("HERO_OVERLAY").match(/rgb\((\d+)_\d+_\d+\/([\d.]+)\)/g) ?? [];
    expect(gradient.length, "the hero overlay declares no translucent stop").toBeGreaterThan(0);
    expect(overlay.length).toBeGreaterThan(0);

    const panel = paint(card, "bg", "light");
    const text = paint(card, "text", "light");
    expect(panel, "the pinned card declares no translucent ground").toBeTruthy();
    expect(text).toBeTruthy();

    for (const stop of gradient) {
      const [, level, alpha] = stop.match(/rgb\((\d+)_\d+_\d+\/([\d.]+)\)/)!;
      const band = over(Number(level), Number(alpha), 255);
      const ground = over(panel!.rgb[0], panel!.alpha, band);
      expect(
        contrastRatio(hex(text!.rgb), hex([ground, ground, ground])),
        `overlay ${alpha} + card ${panel!.alpha} over a white photograph`,
      ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    }
  });

  it("leaves the pinned card visible when no photograph is set", () => {
    // The fallback ground is the black register, and a card that composites
    // to the register's own value has no edge at all.
    const panel = paint(classesAt("CARD", "md"), "bg", "light");
    expect(over(panel!.rgb[0], panel!.alpha, 0), "the card vanishes into the black register").toBeGreaterThan(20);
  });

  it("labels the pinned card with the theme-independent white", () => {
    // `--color-text-on-brand`, never `--color-text-inverse`: the second flips
    // to black in the dark theme, and the photo band does not flip with it.
    expect(declaration("CARD")).toContain("--color-text-on-brand");
    for (const theme of THEMES) {
      expect(themeTokens(theme)["--color-text-on-brand"].toUpperCase()).toBe("#FFFFFF");
    }
  });
});
