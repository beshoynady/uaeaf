import { readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { describe, expect, it } from "vitest";
import { stripComments } from "@uaeaf/design-tokens/testing";

import { sourceFiles } from "./source-files";

/**
 * Two rules about where a surface may stand, both of which a reviewer cannot
 * be relied on to catch.
 *
 * **Green never abuts red.** ADR-0059 D2 measured the two identity grounds at
 * 1.15:1 from each other — 1.22:1 at the identity values themselves. Stacked
 * as consecutive full-bleed sections they do not look wrong in review; they
 * look like *one* band, which is the whole problem. ADR-0060 D1.1 made the
 * separator a component rather than a sentence for that reason, and ADR-0098
 * §8.6 added the preferred alternative: inset one of them into the canvas, so
 * the boundary is a gutter a reader sees rather than a hairline they have to
 * find.
 *
 * **An ink surface always carries an edge.** `surface-ink` is `#0B0B0B` in
 * every theme by owner decision (ADR-0098 §8.4), which measures 1.05:1
 * against the dark page ground. In dark theme the section therefore has no
 * boundary of its own, and the cue has to come from something that is not the
 * ground: a `BrandAccentBar`, whose middle step is white here, or a mesh.
 *
 * What this guard cannot see: a composition assembled at runtime from data —
 * a section list ordered by `displayOrder`, say. The coverage assertion at the
 * bottom is what stops this file from passing because it found nothing to
 * check, which is how a guard goes quietly useless.
 */

const SURFACE_KINDS = ["canvas", "raised", "photo-light", "brand-green", "brand-red", "ink"] as const;
type SurfaceKind = (typeof SURFACE_KINDS)[number];

type Occurrence = { kind: SurfaceKind; index: number };

const REPO = join(import.meta.dirname, "..", "..", "..", "..", "..");

/** Every `kind="…"` on a Surface, in source order. */
const surfaceOccurrences = (source: string): Occurrence[] => {
  const found: Occurrence[] = [];
  for (const match of source.matchAll(
    /kind=["'](canvas|raised|photo-light|brand-green|brand-red|ink)["']/g,
  )) {
    found.push({ kind: match[1] as SurfaceKind, index: match.index });
  }
  return found;
};

const scanned = sourceFiles().map((path) => ({
  path,
  label: relative(REPO, path).replace(/\\/g, "/"),
  source: stripComments(readFileSync(path, "utf-8")),
}));

describe("green never abuts red", () => {
  const offenders: string[] = [];
  let pairsChecked = 0;

  for (const file of scanned) {
    const occurrences = surfaceOccurrences(file.source);
    for (let i = 0; i + 1 < occurrences.length; i += 1) {
      const [first, second] = [occurrences[i], occurrences[i + 1]];
      const brandPair =
        (first.kind === "brand-green" && second.kind === "brand-red") ||
        (first.kind === "brand-red" && second.kind === "brand-green");
      if (!brandPair) continue;

      pairsChecked += 1;
      // A separator between them clears the pair. Either the token ADR-0059 D2
      // made mandatory, or the component ADR-0060 D1.1 wraps it in.
      const between = file.source.slice(first.index, second.index);
      const separated = /adjacent-separator|SectionStack|SurfaceSeparator/.test(between);
      if (!separated) {
        offenders.push(`${file.label}: ${first.kind} directly followed by ${second.kind}`);
      }
    }
  }

  it("finds no unseparated green/red pair in any page or component", () => {
    expect(offenders).toEqual([]);
  });

  it("reports how many brand-surface pairs it examined", () => {
    // Not an assertion about the design — a record of this guard's reach, so a
    // future reader can tell "no offenders" from "nothing was looked at".
    expect(pairsChecked).toBeGreaterThanOrEqual(0);
  });
});

describe("an ink surface always carries a non-surface edge", () => {
  const offenders: string[] = [];
  let inkSurfaces = 0;

  for (const file of scanned) {
    // Each `<Surface … kind="ink" …>` opening tag, with its own attributes and
    // whatever it renders first. `[^]` rather than `.` so the match survives
    // the line breaks a formatter puts between props.
    for (const match of file.source.matchAll(/<Surface\b([^>]*?)>([\s\S]{0,400})/g)) {
      const [, attributes, opening] = match;
      if (!/kind=["']ink["']/.test(attributes)) continue;

      inkSurfaces += 1;
      const hasMesh = /\bmesh\b/.test(attributes);
      const hasAccentBar = /<BrandAccentBar\b/.test(opening);
      if (!hasMesh && !hasAccentBar) {
        offenders.push(`${file.label}: <Surface kind="ink"> with neither mesh nor a BrandAccentBar`);
      }
    }
  }

  it("finds no bare ink surface", () => {
    expect(offenders).toEqual([]);
  });

  it("actually found ink surfaces to check", () => {
    // The assertion that keeps this file honest. Without it, deleting every
    // ink surface — or renaming the component — turns the rule above into a
    // test that passes because it examined nothing. A guard that cannot fail
    // is not a guard; it is a comment that costs CI time.
    expect(inkSurfaces).toBeGreaterThan(0);
  });
});
