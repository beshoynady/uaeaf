import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AA_LARGE_TEXT_OR_NON_TEXT, AA_NORMAL_TEXT, contrastRatio } from "./contrast";

/**
 * Every text tier must clear WCAG AA on every surface it can legally sit on —
 * in every theme.
 *
 * The system already had a token that passed on one ground and failed on four:
 * `color.text.muted` was verified against white only. Checking a text colour
 * against the surface it happens to be used on today is not a contract; the
 * contract is the *cartesian product*, because a surface token exists exactly
 * so that any of them may be used anywhere.
 *
 * `text.disabled` is deliberately excluded: WCAG 2.1 §1.4.3 exempts "text or
 * images of text that are part of an inactive user interface component", and
 * dimming below the threshold is the affordance.
 */

const CSS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../packages/design-tokens/build/css",
);

/**
 * Text tiers that carry meaning and therefore must be readable.
 *
 * `--color-text-link` belongs here: the three auth screens render it, and an
 * unmeasured link colour is how it reached AA failures on two surfaces
 * (ADR-0063 D1).
 *
 * `--color-text-disabled` stays out, and not by oversight: WCAG 1.4.3 exempts
 * inactive components, and the dimming is the affordance.
 */
const TEXT_TIERS = [
  "--color-text-primary",
  "--color-text-secondary",
  "--color-text-muted",
  "--color-text-link",
] as const;

/** Grounds a component may legitimately place body text on. */
const SURFACES = [
  "--color-surface-base",
  "--color-surface-raised",
  "--color-surface-sunken",
] as const;

const THEMES = ["light", "dark", "high-contrast"] as const;

function theme(name: string): Map<string, string> {
  const css = readFileSync(join(CSS_DIR, `${name}.css`), "utf-8");
  return new Map([...css.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/gm)].map(([, k, v]) => [k, v.trim()]));
}

/** Resolves a token to a hex value, or null when it is not a plain colour. */
function hex(tokens: Map<string, string>, name: string): string | null {
  const value = tokens.get(name);
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : null;
}

/**
 * Section registers — the full-bleed identity grounds.
 *
 * The federation's guide §6.1 shows the logo on white, red, green and black
 * grounds as four official options, and its applied materials use them that
 * way on a dozen pages. The project's own §3.34.1 forbade two of the four
 * ("Explicitly NOT: a full-section background wash" for green, "or a section
 * background" for red) — a rule with no basis in the guide it claims to serve.
 * ADR-0059 restores them, and these are the pairings that keep them legible.
 */
const REGISTERS = ["green", "red", "black"] as const;

describe.each(THEMES)("%s theme", (name) => {
  const tokens = theme(name);

  it.each(TEXT_TIERS)("%s clears AA on every surface", (tier) => {
    const text = hex(tokens, tier);
    expect(text, `${tier} is not defined as a hex colour in ${name}.css`).not.toBeNull();

    const failures = SURFACES.flatMap((surface) => {
      const ground = hex(tokens, surface);
      if (!ground) return [];
      const ratio = contrastRatio(text as string, ground);
      return ratio >= AA_NORMAL_TEXT
        ? []
        : [`${tier} (${text}) on ${surface} (${ground}) = ${ratio.toFixed(2)}:1`];
    });

    expect(failures).toEqual([]);
  });

  it("gives border.strong the 3:1 non-text minimum on every surface", () => {
    // WCAG §1.4.11 — a border is how a control's boundary is identified.
    const border = hex(tokens, "--color-border-strong");
    if (!border) return;

    const failures = SURFACES.flatMap((surface) => {
      const ground = hex(tokens, surface);
      if (!ground) return [];
      const ratio = contrastRatio(border, ground);
      return ratio >= AA_LARGE_TEXT_OR_NON_TEXT
        ? []
        : [`--color-border-strong on ${surface} = ${ratio.toFixed(2)}:1`];
    });

    expect(failures).toEqual([]);
  });

  it("keeps the text tiers visually distinct from one another", () => {
    // Three names that resolve to two values is a collapsed hierarchy: the
    // reader sees no difference, and a later editor "fixes" one of them by
    // guessing which was intended.
    //
    // High contrast is exempt, and this is a real exemption rather than a
    // grandfathered failure: that theme sets primary and secondary both to
    // #000000 on #FFFFFF *on purpose* — maximum contrast is the whole point of
    // the mode, and expressing hierarchy by dimming text would work directly
    // against the users who select it. Chapter 7 §7.3 defines it that way.
    if (name === "high-contrast") return;

    const values = TEXT_TIERS.map((tier) => hex(tokens, tier)).filter(Boolean);
    expect(new Set(values).size).toBe(values.length);
  });

  it.each(REGISTERS)("gives the %s section register a legible text ladder", (register) => {
    const surface = hex(tokens, `--color-section-${register}-surface`);
    expect(surface, `--color-section-${register}-surface missing in ${name}.css`).not.toBeNull();

    const failures: string[] = [];
    for (const tier of ["text", "text-muted"] as const) {
      const value = hex(tokens, `--color-section-${register}-${tier}`);
      if (!value) {
        failures.push(`--color-section-${register}-${tier} is not defined`);
        continue;
      }
      const ratio = contrastRatio(value, surface as string);
      if (ratio < AA_NORMAL_TEXT) {
        failures.push(`${tier} (${value}) on ${surface} = ${ratio.toFixed(2)}:1`);
      }
    }

    // A control's boundary inside a coloured section is still a control's
    // boundary — WCAG §1.4.11 applies to it exactly as it does on white.
    const border = hex(tokens, `--color-section-${register}-border`);
    if (!border) {
      failures.push(`--color-section-${register}-border is not defined`);
    } else if (contrastRatio(border, surface as string) < AA_LARGE_TEXT_OR_NON_TEXT) {
      failures.push(
        `border (${border}) on ${surface} = ${contrastRatio(border, surface as string).toFixed(2)}:1`,
      );
    }

    expect(failures).toEqual([]);
  });

  it("keeps every section register visibly separated from the page ground", () => {
    // A register exists to depart from the page. Pure black on a near-black
    // dark theme measures 1.12:1 — the section boundary simply is not there.
    // This is why the black register is the one that changes per theme while
    // green and red do not: their hue carries them even at low luminance
    // contrast, black's cannot.
    const ground = hex(tokens, "--color-surface-base");
    if (!ground || name === "high-contrast") return;

    const failures = REGISTERS.flatMap((register) => {
      const surface = hex(tokens, `--color-section-${register}-surface`);
      if (!surface) return [];
      const ratio = contrastRatio(surface, ground);
      return ratio >= 1.4 ? [] : [`${register} (${surface}) vs page (${ground}) = ${ratio.toFixed(2)}:1`];
    });

    expect(failures).toEqual([]);
  });

  it("never lets the green and red registers meet without a separator", () => {
    // Measured 1.15:1 between them. Two full-bleed sections stacked directly
    // would have no visible boundary at all — and the pair is the classic
    // red/green confusion for ~8% of men besides. The guide never places them
    // adjacent either: in the four-stroke motif there is always white or
    // black between. Recorded as a token so the rule is discoverable at the
    // point of use rather than living only in a document.
    const separator = tokens.get("--color-section-adjacent-separator");
    expect(separator, "sections that may abut need a declared separator").toBeDefined();
  });
});
