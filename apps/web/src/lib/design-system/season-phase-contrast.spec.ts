import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AA_NORMAL_TEXT, contrastRatio, stripComments, themeTokens } from "@uaeaf/design-tokens/testing";
import { SEASON_PHASE_TYPES } from "@/lib/seasons/types";

/**
 * The four season phase treatments, measured (owner decision 2026-09-29).
 *
 * Read from the stylesheet that paints them, so a later edit to a treatment is
 * measured as written. Each phase's name and type are printed on its own ground,
 * so the ink must clear AA normal text on that ground in every theme.
 */

const CSS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "components", "pages", "seasons", "seasons.css");
const THEMES = ["light", "dark", "high-contrast"] as const;

const source = stripComments(readFileSync(CSS, "utf-8"));

/** The token a phase's `--season-phase-<role>` names, from its rule. */
const tokenOf = (type: string, role: "ground" | "ink"): string => {
  const rule = new RegExp(`\\[data-phase="${type}"\\]\\s*\\{([^}]*)\\}`).exec(source)?.[1] ?? "";
  const token = new RegExp(`--season-phase-${role}:\\s*var\\((--[\\w-]+)\\)`).exec(rule)?.[1];
  if (!token) throw new Error(`${type} declares no ${role}`);
  return token;
};

describe("season phase treatments", () => {
  it("declares one treatment for each phase type, and red for none of them", () => {
    for (const type of SEASON_PHASE_TYPES) {
      expect(tokenOf(type, "ground")).toBeTruthy();
      expect(tokenOf(type, "ink")).not.toMatch(/red/);
      expect(tokenOf(type, "ground")).not.toMatch(/red/);
    }
  });

  for (const theme of THEMES) {
    it(`carries its text at AA on its own ground in ${theme}`, () => {
      const tokens = themeTokens(theme);
      const failures = SEASON_PHASE_TYPES.flatMap((type) => {
        const ground = tokens[tokenOf(type, "ground")];
        const ink = tokens[tokenOf(type, "ink")];
        const ratio = contrastRatio(ink, ground);
        return ratio >= AA_NORMAL_TEXT ? [] : [`${type}: ${ink} on ${ground} = ${ratio.toFixed(2)}`];
      });
      expect(failures).toEqual([]);
    });
  }
});
