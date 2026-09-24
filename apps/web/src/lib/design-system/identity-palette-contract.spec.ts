import { readFileSync } from "node:fs";
import { relative } from "node:path";

import { describe, expect, it } from "vitest";
import { stripComments } from "@uaeaf/design-tokens/testing";

import { sourceFiles } from "./source-files";

/**
 * Nothing in an interface is painted a colour the identity does not own.
 *
 * The palette is not short of colours — it has the three identity ramps, a
 * warm neutral scale, five semantic families, three role accents, a
 * categorical scale and the topic chips. A literal hex in a component is
 * therefore never "the token didn't exist"; it is a colour that skipped the
 * measurement every token in `pairings.json` has been through.
 *
 * What this rule is NOT for: it does not police which governed token a
 * designer picked. `color.item.*` and `color.accent.*` are real, measured
 * families, and choosing between them is a design decision, not a defect.
 * This catches the colours that are in no family at all.
 */

const REPO = /[\\/]uaeaf-project[\\/]/;

/**
 * Where a literal colour is legitimate, each with the reason it is.
 *
 * Exempted by path rather than by pattern, so a new file cannot inherit an
 * exemption by resembling an old one.
 */
const ALLOWED = [
  {
    match: /platform-badge|platform-mark|social|navigation\.ts/,
    reason:
      "Platform marks in their own brand colours. YouTube red and Instagram's gradient are those companies' identities, not ours, and recolouring a third-party mark misrepresents it.",
  },
  {
    match: /colour-review/,
    reason:
      "The internal colour-review route. Its whole subject is candidate palettes, which have to be written literally to be compared.",
  },
  {
    match: /opengraph-image|icon\.tsx|apple-icon/,
    reason:
      "Rendered by Satori in a separate runtime with no CSS custom properties. A token would resolve to nothing there.",
  },
  {
    match: /\.(spec|test)\.tsx?$/,
    reason: "A test names colours in order to measure them.",
  },
] as const;

const exemptionFor = (file: string) => ALLOWED.find(({ match }) => match.test(file));

/** A literal colour: a hex, or a colour function with numbers in it. */
const LITERAL_COLOUR =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla|oklch|lab)\(\s*[\d.]/g;

/** Tailwind's own palette — a family the project deliberately does not use. */
const TAILWIND_PALETTE =
  /\b(?:bg|text|border|from|to|via|ring|outline|fill|stroke|decoration)-(?:slate|gray|zinc|neutral|stone|orange|amber|yellow|lime|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;

const scanned = sourceFiles().map((path) => ({
  path,
  label: path.split(REPO)[1]?.replace(/\\/g, "/") ?? relative(process.cwd(), path),
  source: stripComments(readFileSync(path, "utf-8")),
}));

describe("every colour in an interface comes from the identity", () => {
  it("scans a real number of files, so the rules below cannot pass vacuously", () => {
    expect(scanned.length).toBeGreaterThan(40);
  });

  it("writes no literal colour outside the recorded exemptions", () => {
    const offenders: string[] = [];
    for (const file of scanned) {
      if (exemptionFor(file.label)) continue;
      for (const match of file.source.matchAll(LITERAL_COLOUR)) {
        offenders.push(`${file.label}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("uses no colour from Tailwind's own palette", () => {
    // The project replaced the cool `gray` ramp with `neutral-warm` (ADR-0051)
    // and measured every family it kept. A Tailwind palette class is a colour
    // from outside that work, and it reads as "close enough" rather than as a
    // decision — which is exactly how two cool greys got into the contact page
    // and had to be found by an audit (ADR-0065).
    const offenders: string[] = [];
    for (const file of scanned) {
      if (exemptionFor(file.label)) continue;
      for (const match of file.source.matchAll(TAILWIND_PALETTE)) {
        offenders.push(`${file.label}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("records why each exemption exists", () => {
    // An exemption list with no reasons becomes a place to put anything.
    for (const { reason } of ALLOWED) {
      expect(reason.length).toBeGreaterThan(40);
    }
  });
});
